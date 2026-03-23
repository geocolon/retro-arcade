import Phaser from 'phaser';
import { SocketManager } from '../network/SocketManager.js';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width/2, height/2, 400, 20, 0x333333);
    const bar   = this.add.rectangle(width/2 - 200, height/2, 0, 20, 0xe63946).setOrigin(0, 0.5);
    this.load.on('progress', v => { bar.width = 400 * v; });
    this.add.text(width/2, height/2 - 30, 'LOADING...', { fontFamily:'Arial', fontSize:'14px', color:'#ffffff' }).setOrigin(0.5);
    this._generatePlaceholderTextures();
  }

  create() { SocketManager.connect(); this.scene.start('MenuScene'); }

  _generatePlaceholderTextures() {
    const g = this.make.graphics({ x:0, y:0, add:false });

    g.clear(); g.fillStyle(0x457b9d); g.fillRect(0,0,32,48); g.fillStyle(0xf4a261); g.fillRect(8,0,16,16);
    this._buildSheet(g, 'player1', 32, 48, 4);

    g.clear(); g.fillStyle(0xe63946); g.fillRect(0,0,32,48); g.fillStyle(0xf4a261); g.fillRect(8,0,16,16);
    this._buildSheet(g, 'player2', 32, 48, 4);

    g.clear(); g.fillStyle(0x2d3436); g.fillRect(0,0,32,48); g.fillStyle(0x636e72); g.fillRect(8,0,16,16);
    this._buildSheet(g, 'enemy', 32, 48, 4);

    g.clear(); g.fillStyle(0x6b4f2e); g.fillRect(0,0,32,32); g.lineStyle(1,0x4a3520); g.strokeRect(0,0,32,32);
    this.textures.addCanvas('ground', g.canvas);
    g.destroy();
  }

  _buildSheet(g, key, fw, fh, frames) {
    const rt = this.add.renderTexture(0,0,fw*frames,fh).setVisible(false);
    for (let i=0; i<frames; i++) { g.y = (i%2===0)?0:2; rt.draw(g, fw*i, 0); }
    rt.saveTexture(key); rt.destroy();
  }
}
