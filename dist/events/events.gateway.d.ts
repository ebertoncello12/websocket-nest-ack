import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
interface PlayCardPayload {
    tableId: string;
    playerId: string;
    card: {
        suit: string;
        value: number;
    };
}
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private logger;
    private tablePlayers;
    server: Server;
    afterInit(server: Server): void;
    handleConnection(client: Socket, ...args: any[]): void;
    handleDisconnect(client: Socket): void;
    handleJoinTable(client: Socket, payload: {
        tableId: string;
    }): void;
    handlePlayCard(client: Socket, payload: PlayCardPayload): Promise<void>;
}
export {};
