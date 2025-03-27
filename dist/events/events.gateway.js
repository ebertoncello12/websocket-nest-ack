"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
let EventsGateway = class EventsGateway {
    constructor() {
        this.logger = new common_1.Logger('EventsGateway');
        this.tablePlayers = new Map();
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    handleConnection(client, ...args) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.tablePlayers.forEach((players, tableId) => {
            players.delete(client);
        });
    }
    handleJoinTable(client, payload) {
        if (!this.tablePlayers.has(payload.tableId)) {
            this.tablePlayers.set(payload.tableId, new Set());
        }
        this.tablePlayers.get(payload.tableId).add(client);
        this.logger.log(`Player ${client.id} joined table ${payload.tableId}`);
    }
    async handlePlayCard(client, payload) {
        this.logger.log(`Player ${payload.playerId} played card: ${JSON.stringify(payload.card)}`);
        const tablePlayers = this.tablePlayers.get(payload.tableId) || new Set();
        const gameState = {
            type: 'cardPlayed',
            playerId: payload.playerId,
            card: payload.card,
            timestamp: Date.now(),
            requestId: `${payload.playerId}-${Date.now()}`
        };
        const acknowledgments = new Set();
        tablePlayers.forEach((player) => {
            player.emit('gameUpdate', gameState, (ack) => {
                if (ack && ack.success) {
                    acknowledgments.add(player.id);
                    this.logger.log(`Player ${player.id} acknowledged card play`);
                    if (acknowledgments.size === tablePlayers.size) {
                        this.logger.log('All players acknowledged the card play');
                    }
                }
            });
        });
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinTable'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinTable", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('playCard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handlePlayCard", null);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    })
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map