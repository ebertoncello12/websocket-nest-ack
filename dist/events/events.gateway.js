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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const cache_manager_1 = require("@nestjs/cache-manager");
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const bullmq_1 = require("bullmq");
const bullmq_2 = require("@nestjs/bullmq");
let EventsGateway = class EventsGateway {
    constructor(cacheManager, retryQueue) {
        this.cacheManager = cacheManager;
        this.retryQueue = retryQueue;
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY_MS = 500;
        this.PENDING_MESSAGES_KEY = 'pending_messages';
    }
    async handleConnection(client, ...args) {
        console.log(`Client connected: ${client.id}`);
    }
    async handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
        const pendingMessages = await this.getPendingMessages();
        for (const [messageId, message] of Object.entries(pendingMessages)) {
            if (message.clientId === client.id) {
                if (message.jobId) {
                    await this.retryQueue.remove(message.jobId);
                }
                await this.removePendingMessage(messageId);
            }
        }
    }
    async handlePlayCard(client, payload) {
        console.log(`Player ${client.id} played card: ${payload.suit} - ${payload.value}`);
        await this.sendCardPlayed(client, payload);
    }
    async retryCardPlayed(clientId, payload, retries) {
        const client = this.server.sockets.sockets.get(clientId);
        if (!client) {
            console.log(`Client ${clientId} not found, removing from pending`);
            const messageId = `${clientId}-${payload.suit}-${payload.value}`;
            await this.removePendingMessage(messageId);
            return;
        }
        await this.sendCardPlayed(client, payload, retries);
    }
    async getPendingMessages() {
        const messages = await this.cacheManager.get(this.PENDING_MESSAGES_KEY);
        return messages || {};
    }
    async savePendingMessages(messages) {
        await this.cacheManager.set(this.PENDING_MESSAGES_KEY, messages);
    }
    async addPendingMessage(messageId, message) {
        const messages = await this.getPendingMessages();
        messages[messageId] = message;
        await this.savePendingMessages(messages);
    }
    async removePendingMessage(messageId) {
        var _a;
        const messages = await this.getPendingMessages();
        if ((_a = messages[messageId]) === null || _a === void 0 ? void 0 : _a.jobId) {
            await this.retryQueue.remove(messages[messageId].jobId);
        }
        delete messages[messageId];
        await this.savePendingMessages(messages);
    }
    async sendCardPlayed(client, payload, retries = 0) {
        console.log('disparou aqui ?');
        const messageId = `${client.id}-${payload.suit}-${payload.value}`;
        const ackCallback = async (ack) => {
            const messages = await this.getPendingMessages();
            console.log(messages);
            const entry = messages[messageId];
            if (!entry)
                return;
            await this.removePendingMessage(messageId);
            if (ack && ack.success) {
                console.log(`Player ${client.id} acknowledged card play`);
            }
            else {
                console.log(`Player ${client.id} sent invalid ack. Not retrying.`);
            }
        };
        client.emit("cardPlayed", payload, ackCallback);
        const job = await this.retryQueue.add('retryCardPlayed', {
            clientId: client.id,
            payload,
            retries,
        }, {
            delay: this.RETRY_DELAY_MS,
            jobId: messageId,
            attempts: this.MAX_RETRIES,
            backoff: {
                type: 'fixed',
                delay: this.RETRY_DELAY_MS,
            },
        });
        await this.addPendingMessage(messageId, {
            clientId: client.id,
            payload,
            retries,
            jobId: job.id,
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
    __metadata("design:returntype", Promise)
], EventsGateway.prototype, "handlePlayCard", null);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: "*",
        },
    }),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __param(1, (0, bullmq_2.InjectQueue)('retryQueue')),
    __metadata("design:paramtypes", [Object, bullmq_1.Queue])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map