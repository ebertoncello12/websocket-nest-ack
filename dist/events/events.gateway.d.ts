import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Cache } from 'cache-manager';
import { Server, Socket } from "socket.io";
import { Queue } from 'bullmq';
type CardPayload = {
    value: number;
    suit: string;
};
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private cacheManager;
    private retryQueue;
    server: Server;
    constructor(cacheManager: Cache, retryQueue: Queue);
    MAX_RETRIES: number;
    RETRY_DELAY_MS: number;
    PENDING_MESSAGES_KEY: string;
    handleConnection(client: Socket, ...args: any[]): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handlePlayCard(client: Socket, payload: {
        value: number;
        suit: string;
    }): Promise<void>;
    retryCardPlayed(clientId: string, payload: CardPayload, retries: number): Promise<void>;
    private getPendingMessages;
    private savePendingMessages;
    private addPendingMessage;
    private removePendingMessage;
    sendCardPlayed(client: Socket, payload: CardPayload): Promise<void>;
}
export {};
