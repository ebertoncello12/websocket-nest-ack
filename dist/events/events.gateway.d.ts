import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private logger;
    private tablePlayers;
    server: Server;
    handleConnection(client: Socket, ...args: any[]): void;
    handleDisconnect(client: Socket): void;
    MAX_RETRIES: number;
    RETRY_DELAY_MS: number;
    private pendingMessages;
    handlePlayCard(client: Socket, payload: {
        value: number;
        suit: string;
    }): void;
    private sendCardPlayed;
}
