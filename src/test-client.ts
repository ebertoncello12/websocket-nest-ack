import { io, Socket } from 'socket.io-client';

class GameClient {
    private socket: Socket;
    private playerId: string;
    private tableId: string;

    constructor(playerId: string, tableId: string) {
        this.playerId = playerId;
        this.tableId = tableId;
        this.socket = io('http://localhost:3000');
        this.setupListeners();
    }

    private setupListeners() {
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.joinTable();
        });

        this.socket.on('gameUpdate', (gameState: any, callback) => {
            console.log('Atualização do jogo recebida:', gameState);

            // Simula tempo de processamento
            setTimeout(() => {
                // Envia confirmação de volta para o servidor
                callback({
                    success: true,
                    playerId: this.playerId,
                    requestId: gameState.requestId
                });
                console.log(`Jogador ${this.playerId} confirmou recebimento da atualização do jogo`);
            }, 1000);
        });

        this.socket.on('playCardError', (error) => {
            console.error('Erro ao jogar carta:', error);
        });
    }

    private joinTable() {
        this.socket.emit('joinTable', { tableId: this.tableId });
        console.log(`Jogador ${this.playerId} entrou na mesa ${this.tableId}`);
    }

    public playCard(suit: string, value: number) {
        const payload = {
            tableId: this.tableId,
            playerId: this.playerId,
            card: { suit, value }
        };

        this.socket.emit('playCard', payload);
        console.log('Carta jogada:', payload);
    }

    public disconnect() {
        this.socket.disconnect();
        console.log(`Jogador ${this.playerId} desconectou do servidor`);
    }
}

// Teste do cliente
async function runTest() {
    console.log('Iniciando teste com dois jogadores...');

    // Cria dois jogadores para teste
    const player1 = new GameClient('jogador1', 'mesa1');
    const player2 = new GameClient('jogador2', 'mesa1');

    // Aguarda as conexões serem estabelecidas
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nJogador 1 vai jogar uma carta...');
    // Jogador 1 joga uma carta
    player1.playCard('copas', 7);

    // Mantém o processo rodando para ver as interações
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\nFinalizando teste...');
    // Limpeza
    player1.disconnect();
    player2.disconnect();
}

runTest().catch(error => console.error('Erro no teste:', error));