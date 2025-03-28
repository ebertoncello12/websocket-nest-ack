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

type CardPayload = { value: number; suit: string };

interface PendingMessage {
  client: Socket;
  payload: CardPayload;
  retries: number;
  timeoutId: NodeJS.Timeout;
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache,) {}

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  MAX_RETRIES = 3;
  RETRY_DELAY_MS = 500;

  private pendingMessages: Map<string, PendingMessage> = new Map();

  @SubscribeMessage("playCard")
  handlePlayCard(client: Socket, payload: { value: number; suit: string }) {
    console.log(
      `Player ${client.id} played card: ${payload.suit} - ${payload.value}`
    );
    this.sendCardPlayed(client, payload);
  }

  private sendCardPlayed(client: Socket, payload: CardPayload, retries = 0) {
    const messageId = `${client.id}-${payload.suit}-${payload.value}`;

    const ackCallback = (ack: any) => {
      const entry = this.pendingMessages.get(messageId);
      if (!entry) return;

      clearTimeout(entry.timeoutId);
      this.pendingMessages.delete(messageId);

      if (ack && ack.success) {
        console.log(`Player ${client.id} acknowledged card play`);
      } else {
        console.log(`Player ${client.id} sent invalid ack. Not retrying.`);
      }
    };

    // Emit with ACK callback
    client.emit("cardPlayed", payload, ackCallback);

    // Schedule retry if no ack in time
    const timeoutId = setTimeout(() => {
      const current = this.pendingMessages.get(messageId);
      if (!current) return;

      if (current.retries < this.MAX_RETRIES) {
        console.log(
          `Retrying cardPlayed to ${client.id}, attempt ${current.retries + 1}`
        );
        this.sendCardPlayed(client, payload, current.retries + 1);
      } else {
        console.log(
          `Player ${client.id} did not acknowledge after ${this.MAX_RETRIES} retries.`
        );
        this.pendingMessages.delete(messageId);
      }
    }, this.RETRY_DELAY_MS);

    // Track the pending message
    this.pendingMessages.set(messageId, {
      client,
      payload,
      retries,
      timeoutId,
    });
  }
}
