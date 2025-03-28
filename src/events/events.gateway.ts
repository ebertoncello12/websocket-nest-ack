import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Cache } from 'cache-manager';
import { Server, Socket } from "socket.io";
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

type CardPayload = { value: number; suit: string };

interface PendingMessage {
  clientId: string;
  payload: CardPayload;
  retries: number;
  jobId?: string;
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
      @InjectQueue('retryQueue') private retryQueue: Queue
  ) {}

  MAX_RETRIES = 3;
  RETRY_DELAY_MS = 500;
  PENDING_MESSAGES_KEY = 'pending_messages';

  async handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("playCard")
  async handlePlayCard(client: Socket, payload: { value: number; suit: string }) {
    console.log(
        `Player ${client.id} played card: ${payload.suit} - ${payload.value}`
    );
    await this.sendCardPlayed(client, payload);
  }

  // Novo método para ser chamado pelo worker
  async retryCardPlayed(clientId: string, payload: CardPayload, retries: number) {
    const client = this.server.sockets.sockets.get(clientId);
    if (!client) {
      console.log(`Client ${clientId} not found, removing from pending`);
      const messageId = `${clientId}-${payload.suit}-${payload.value}`;
      await this.removePendingMessage(messageId);
      return;
    }

    await this.sendCardPlayed(client, payload, retries);
  }

  private async getPendingMessages(): Promise<Record<string, PendingMessage>> {
    const messages = await this.cacheManager.get<Record<string, PendingMessage>>(this.PENDING_MESSAGES_KEY);
    return messages || {};
  }

  private async savePendingMessages(messages: Record<string, PendingMessage>): Promise<void> {
    await this.cacheManager.set(this.PENDING_MESSAGES_KEY, messages);
  }

  private async addPendingMessage(messageId: string, message: PendingMessage): Promise<void> {
    const messages = await this.getPendingMessages();
    messages[messageId] = message;
    await this.savePendingMessages(messages);
  }

  private async removePendingMessage(messageId: string): Promise<void> {
    const messages = await this.getPendingMessages();
    if (messages[messageId]?.jobId) {
      await this.retryQueue.remove(messages[messageId].jobId);
    }
    delete messages[messageId];
    await this.savePendingMessages(messages);
  }

  private async sendCardPlayed(client: Socket, payload: CardPayload, retries = 0) {
    console.log('disparou aqui ?')
    const messageId = `${client.id}-${payload.suit}-${payload.value}`;

    const ackCallback = async (ack: any) => {
      const messages = await this.getPendingMessages();
      console.log(messages);
      const entry = messages[messageId];
      if (!entry) return;

      await this.removePendingMessage(messageId);

      if (ack && ack.success) {
        console.log(`Player ${client.id} acknowledged card play`);
      } else {
        console.log(`Player ${client.id} sent invalid ack. Not retrying.`);
      }
    };

    client.emit("cardPlayed", payload, ackCallback);

    // Agora usamos o BullMQ para lidar com os retries
    const job = await this.retryQueue.add(
        'retryCardPlayed',
        {
          clientId: client.id,
          payload,
          retries,
        },
        {
          delay: this.RETRY_DELAY_MS,
          jobId: messageId,
          attempts: this.MAX_RETRIES,
          backoff: {
            type: 'fixed',
            delay: this.RETRY_DELAY_MS,
          },
        }
    );

    await this.addPendingMessage(messageId, {
      clientId: client.id,
      payload,
      retries,
      jobId: job.id,
    });
  }
}