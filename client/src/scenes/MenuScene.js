import Phaser from 'phaser';
import { SocketManager } from '../network/SocketManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0,0,width,height,0x0a0a1a).setOrigin(0);
    for (let y=0; y<height; y+=4) this.add.rectangle(0,y,width,1,0x000000,0.15).setOrigin(0);

    this.add.text(width/2, 80, 'STREETS OF RAGE', { fontFamily:'Arial Black, Arial', fontSize:'42px', color:'#e63946', stroke:'#000000', strokeThickness:6 }).setOrigin(0.5);
    this.add.text(width/2, 125, 'BROWSER EDITION', { fontFamily:'Arial', fontSize:'16px', color:'#f4a261', letterSpacing:6 }).setOrigin(0.5);

    this._btn(width/2, 220, '▶  SINGLE PLAYER',   () => this._start({ mode:'solo' }));
    this._btn(width/2, 280, '👥  HOST CO-OP ROOM', () => SocketManager.emit('room:create'));
    this._btn(width/2, 340, '🔗  JOIN ROOM',        () => {
      const code = prompt('Enter 4-letter room code:');
      if (code?.trim().length === 4) SocketManager.emit('room:join', { roomCode: code.trim().toUpperCase() });
    });

    this._status = this.add.text(width/2, 400, '', { fontFamily:'Arial', fontSize:'14px', color:'#00c853' }).setOrigin(0.5);
    this.add.text(width/2, 435, 'WASD/Arrows = Move   Z = Punch   X = Kick   Up/W = Jump   P = Pause', { fontFamily:'Arial', fontSize:'11px', color:'#636e72' }).setOrigin(0.5);

    SocketManager.on('room:created', ({ roomCode }) => this._status.setText(`Room: ${roomCode}  —  Waiting for Player 2...`).setColor('#f4a261'));
    SocketManager.on('room:joined',  ({ roomCode, playerIndex }) => this._status.setText(`Joined ${roomCode} as Player ${playerIndex+1}`).setColor('#00c853'));
    SocketManager.on('game:start',   data => this._start(data));
  }

  _btn(x, y, label, cb) {
    const t = this.add.text(x, y, label, { fontFamily:'Arial', fontSize:'20px', color:'#ffffff', padding:{x:20,y:10} }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    t.on('pointerover', () => { t.setColor('#f4a261'); t.setScale(1.05); });
    t.on('pointerout',  () => { t.setColor('#ffffff'); t.setScale(1); });
    t.on('pointerdown', cb);
  }

  _start(data) { this.scene.start('GameScene', data); this.scene.launch('HUDScene', data); }
}
