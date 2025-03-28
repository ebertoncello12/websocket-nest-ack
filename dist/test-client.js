"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
class GameClient {
    constructor(playerId, tableId) {
        this.playerId = playerId;
        this.tableId = tableId;
        this.socket = (0, socket_io_client_1.io)('http://localhost:3000');
        this.setupListeners();
    }
    setupListeners() {
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.joinTable();
        });
        this.socket.on('gameUpdate', (gameState, callback) => {
            console.log('Atualização do jogo recebida:', gameState);
            setTimeout(() => {
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
    joinTable() {
        this.socket.emit('joinTable', { tableId: this.tableId });
        console.log(`Jogador ${this.playerId} entrou na mesa ${this.tableId}`);
    }
    playCard(suit, value) {
        const payload = {
            tableId: this.tableId,
            playerId: this.playerId,
            card: { suit, value }
        };
        this.socket.emit('playCard', payload);
        console.log('Carta jogada:', payload);
    }
    disconnect() {
        this.socket.disconnect();
        console.log(`Jogador ${this.playerId} desconectou do servidor`);
    }
}
async function runTest() {
    console.log('Iniciando teste com dois jogadores...');
    const player1 = new GameClient('jogador1', 'mesa1');
    const player2 = new GameClient('jogador2', 'mesa1');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('\nJogador 1 vai jogar uma carta...');
    player1.playCard('copas', 7);
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('\nFinalizando teste...');
    player1.disconnect();
    player2.disconnect();
}
runTest().catch(error => console.error('Erro no teste:', error));
//# sourceMappingURL=test-client.js.map