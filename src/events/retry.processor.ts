import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EventsGateway } from './events.gateway';
import { Injectable } from '@nestjs/common';

@Processor('retryQueue')
@Injectable()
export class RetryProcessor extends WorkerHost {
    constructor(private readonly eventsGateway: EventsGateway) {
        super();
    }

    async process(job: Job<{ clientId: string; payload: any; retries: number }>) {
        const { clientId, payload } = job.data;

        console.log(`Processando retry para cliente ${clientId}`);

        // Verifica se o cliente ainda está conectado
        const client = this.eventsGateway.server.sockets.sockets.get(clientId);

        if (!client) {
            console.log(`Cliente ${clientId} não está mais conectado. Descarte a mensagem.`);
            return;
        }

        await this.eventsGateway.sendCardPlayed(client, payload);

        console.log(`Mensagem reenviada para cliente ${clientId}`);
    }
}