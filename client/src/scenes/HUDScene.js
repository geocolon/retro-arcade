import Phaser from 'phaser';

export class HUDScene extends Phaser.Scene {
  constructor() { super({ key: 'HUDScene' }); }
  init() { this._bars=[]; this._scoreTexts=[]; this._livesTexts=[]; }
  create() {
    const { width } = this.scale;
    const gs = this.scene.get('GameScene');
    this._buildHUD(0, 10, 10);
    if (gs?._mode !== 'solo') this._buildHUD(1, width-200, 10);
    if (gs) {
      gs.events.on('player:healthChanged', this._onHealth, this);
      gs.events.on('score:updated',        this._onScore,  this);
      gs.events.on('player:died',          this._onDied,   this);
      gs.events.on('hud:init',             this._onInit,   this);
    }
    this._pauseTxt = this.add.text(width/2, 20, '', { fontFamily:'Arial', fontSize:'14px', color:'#f4a261' }).setOrigin(0.5);
    this.input.keyboard.on('keydown-P', () => {
      const s = this.scene.get('GameScene');
      if (!s) return;
      if (s.scene.isPaused('GameScene')) { s.scene.resume('GameScene'); this._pauseTxt.setText(''); }
      else { s.scene.pause('GameScene'); this._pauseTxt.setText('⏸ PAUSED — Press P to resume'); }
    });
  }
  _buildHUD(idx, x, y) {
    const color = idx===0 ? '#457b9d' : '#e63946';
    this.add.text(x, y, `P${idx+1}`, { fontFamily:'Arial Black', fontSize:'14px', color, stroke:'#000', strokeThickness:3 });
    this.add.rectangle(x+30, y+7, 140, 14, 0x333333).setOrigin(0);
    const bar = this.add.rectangle(x+30, y+7, 140, 14, 0x00c853).setOrigin(0);
    this._bars[idx] = bar;
    this._scoreTexts[idx] = this.add.text(x, y+20, 'SCORE: 0', { fontFamily:'Arial', fontSize:'11px', color:'#ffffff' });
    this._livesTexts[idx] = this.add.text(x, y+34, '❤❤❤', { fontFamily:'Arial', fontSize:'11px', color:'#e63946' });
  }
  _onInit({ players }) { players.forEach(p => { this._updateBar(p.playerIndex, p.health, 100); this._updateLives(p.playerIndex, p.lives); }); }
  _onHealth({ playerIndex, health }) { this._updateBar(playerIndex, health, 100); }
  _onScore({ playerIndex, score })   { if (this._scoreTexts[playerIndex]) this._scoreTexts[playerIndex].setText(`SCORE: ${score.toLocaleString()}`); }
  _onDied({ playerIndex, lives })    { this._updateLives(playerIndex, lives); }
  _updateBar(idx, hp, max) {
    const bar = this._bars[idx]; if (!bar) return;
    const pct = Math.max(0, hp/max);
    bar.width = 140*pct;
    bar.fillColor = pct>0.5 ? 0x00c853 : pct>0.25 ? 0xf4a261 : 0xe63946;
  }
  _updateLives(idx, lives) { if (this._livesTexts[idx]) this._livesTexts[idx].setText('❤'.repeat(Math.max(0,lives))); }
}
