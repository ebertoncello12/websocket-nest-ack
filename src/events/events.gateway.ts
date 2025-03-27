import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface PlayCardPayload {
  tableId: string;
  playerId: string;
  card: {
    suit: string;
    value: number;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger('EventsGateway');
  private tablePlayers: Map<string, Set<Socket>> = new Map();

  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.tablePlayers.forEach((players, tableId) => {
      players.delete(client);
    });
  }

  @SubscribeMessage('joinTable')
  handleJoinTable(client: Socket, payload: { tableId: string }) {
    if (!this.tablePlayers.has(payload.tableId)) {
      this.tablePlayers.set(payload.tableId, new Set());
    }
    this.tablePlayers.get(payload.tableId).add(client);
    this.logger.log(`Player ${client.id} joined table ${payload.tableId}`);
  }

  @SubscribeMessage('playCard')
  async handlePlayCard(
      client: Socket,
      payload: PlayCardPayload,
  ): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;

    const sendCardPlay = () => {
      try {
        this.logger.log(`Attempt ${attempt + 1}: Player ${payload.playerId} playing card`);

        // Get all players at the table
        const tablePlayers = this.tablePlayers.get(payload.tableId) || new Set();

        // Simulate random server error (for testing purposes)
        if (Math.random() < 0.3) {
          throw new Error('Simulated server error while processing card play');
        }

        // Create game state update
        const gameState = {
          type: 'cardPlayed',
          playerId: payload.playerId,
          card: payload.card,
          timestamp: Date.now(),
          requestId: `${payload.playerId}-${Date.now()}`,
          attempt: attempt + 1
        };

        // Track acknowledgments from all players
        const acknowledgments = new Set();
        const timeoutDuration = 5000; // 5 seconds timeout for acknowledgments

        tablePlayers.forEach((player) => {
          // Send game state to each player and wait for acknowledgment
          player.emit('gameUpdate', gameState, (ack) => {
            if (ack && ack.success) {
              acknowledgments.add(player.id);
              this.logger.log(`Player ${player.id} acknowledged card play (attempt ${attempt + 1})`);

              // If all players have acknowledged
              if (acknowledgments.size === tablePlayers.size) {
                this.logger.log(`All players acknowledged the card play (attempt ${attempt + 1})`);
              }
            }
          });

          // Set timeout for acknowledgment
          setTimeout(() => {
            if (!acknowledgments.has(player.id)) {
              this.logger.warn(`No acknowledgment from player ${player.id} (attempt ${attempt + 1})`);

              // Retry if we haven't reached max attempts
              if (attempt < maxRetries) {
                attempt++;
                this.logger.log('Retrying card play due to missing acknowledgments...');
                sendCardPlay();
              } else {
                this.logger.error('Max retries reached. Some players failed to acknowledge.');
                client.emit('playCardError', {
                  success: false,
                  message: 'Failed to confirm card play with all players',
                  requestId: gameState.requestId
                });
              }
            }
          }, timeoutDuration);
        });

      } catch (error) {
        this.logger.error(`Error processing card play: ${error.message}`);

        if (attempt < maxRetries) {
          attempt++;
          this.logger.log(`Retrying card play (attempt ${attempt + 1})...`);
          sendCardPlay();
        } else {
          this.logger.error('Max retries reached. Card play failed.');
          client.emit('playCardError', {
            success: false,
            message: 'Failed to process card play',
            error: error.message
          });
        }
      }
    };

    // Start the card play process
    sendCardPlay();
  }
}