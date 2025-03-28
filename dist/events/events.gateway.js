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
const socket_io_1 = require("socket.io");
let EventsGateway = class EventsGateway {
    constructor() {
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY_MS = 500;
        this.pendingMessages = new Map();
    }
    handleConnection(client, ...args) {
        console.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
    }
    handlePlayCard(client, payload) {
        console.log(`Player ${client.id} played card: ${payload.suit} - ${payload.value}`);
        this.sendCardPlayed(client, payload);
    }
    sendCardPlayed(client, payload, retries = 0) {
        const messageId = `${client.id}-${payload.suit}-${payload.value}`;
        const ackCallback = (ack) => {
            const entry = this.pendingMessages.get(messageId);
            if (!entry)
                return;
            clearTimeout(entry.timeoutId);
            this.pendingMessages.delete(messageId);
            if (ack && ack.success) {
                console.log(`Player ${client.id} acknowledged card play`);
            }
            else {
                console.log(`Player ${client.id} sent invalid ack. Not retrying.`);
            }
        };
        client.emit("cardPlayed", payload, ackCallback);
        const timeoutId = setTimeout(() => {
            const current = this.pendingMessages.get(messageId);
            if (!current)
                return;
            if (current.retries < this.MAX_RETRIES) {
                console.log(`Retrying cardPlayed to ${client.id}, attempt ${current.retries + 1}`);
                this.sendCardPlayed(client, payload, current.retries + 1);
            }
            else {
                console.log(`Player ${client.id} did not acknowledge after ${this.MAX_RETRIES} retries.`);
                this.pendingMessages.delete(messageId);
            }
        }, this.RETRY_DELAY_MS);
        this.pendingMessages.set(messageId, {
            client,
            payload,
            retries,
            timeoutId,
        });
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("playCard"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handlePlayCard", null);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: "*",
        },
    })
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map