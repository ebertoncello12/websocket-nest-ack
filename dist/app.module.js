"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const events_module_1 = require("./events/events.module");
const cache_manager_1 = require("@nestjs/cache-manager");
const cache_manager_redis_yet_1 = require("cache-manager-redis-yet");
const bullmq_1 = require("@nestjs/bullmq");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            events_module_1.EventsModule,
            cache_manager_1.CacheModule.registerAsync({
                useFactory: async () => {
                    const store = await (0, cache_manager_redis_yet_1.redisStore)({
                        socket: {
                            host: process.env.REDIS_HOST || "localhost",
                            port: Number(process.env.REDIS_PORT) || 6379,
                        },
                        password: process.env.REDIS_PASSWORD || "password",
                    });
                    return {
                        store: store,
                        ttl: 3 * 60000,
                    };
                },
                isGlobal: true,
            }),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: "localhost",
                    port: 6379,
                },
            }),
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map