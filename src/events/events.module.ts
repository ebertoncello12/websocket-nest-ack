import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { RetryProcessor } from './retry.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'retryQueue',
    }),
  ],
  providers: [EventsGateway, RetryProcessor],
})
export class EventsModule {}