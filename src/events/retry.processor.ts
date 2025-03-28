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
        const { clientId, payload, retries } = job.data;

        // Aqui você precisaria ter acesso ao socket do cliente
        // Como não temos isso diretamente, você pode precisar ajustar sua abordagem
        // Vou manter a lógica similar ao seu código original
       // por enquanto vai fazer porra nnehuma
        console.log('disparou a fila ?')
        //Todo: Fazer o reprocessamento das mensagens
    }
}