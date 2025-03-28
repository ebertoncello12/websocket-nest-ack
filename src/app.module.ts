import { Module } from "@nestjs/common";
import { EventsModule } from "./events/events.module";
import { CacheModule } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-yet";

@Module({
  imports: [
    EventsModule,
    CacheModule.registerAsync({
      useFactory: async () => {
        const store = await redisStore({
          socket: {
            host: process.env.REDIS_HOST || "localhost",
            port: Number(process.env.REDIS_PORT) || 6379,
          },
          password: process.env.REDIS_PASSWORD || "password",
        });

        return {
          store: store,
          ttl: 3 * 60000, // 3 minutes (milliseconds)
        };
      },
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
