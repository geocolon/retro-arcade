import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }
  init(data) { this._win = data.win||false; this._scores = data.scores||[]; }
  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0,0,width,height,0x0a0a1a,0.92).setOrigin(0);
    const title = this._win ? '🏆 STAGE CLEAR!' : '💀 GAME OVER';
    const color = this._win ? '#00c853' : '#e63946';
    this.add.text(width/2, 100, title, { fontFamily:'Arial Black', fontSize:'52px', color, stroke:'#000', strokeThickness:8 }).setOrigin(0.5);
    this._scores.forEach(({ playerIndex, score }, i) => {
      this.add.text(width/2, 200+i*50, `Player ${playerIndex+1}:  ${score.toLocaleString()} pts`, { fontFamily:'Arial', fontSize:'24px', color:'#ffffff' }).setOrigin(0.5);
    });
    const btn = this.add.text(width/2, 340, '▶  PLAY AGAIN', { fontFamily:'Arial Black', fontSize:'22px', color:'#ffffff' }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    btn.on('pointerover', () => btn.setColor('#f4a261'));
    btn.on('pointerout',  () => btn.setColor('#ffffff'));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
