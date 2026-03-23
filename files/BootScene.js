import Phaser from 'phaser';
import { SocketManager } from '../network/SocketManager.js';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    const { width, height } = this.scale;
    this.add.rectangle(width/2, height/2, 400, 20, 0x333333);
    const bar = this.add.rectangle(width/2 - 200, height/2, 0, 20, 0xe63946).setOrigin(0, 0.5);
    this.load.on('progress', v => { bar.width = 400 * v; });
    this.add.text(width/2, height/2 - 30, 'LOADING...', {
      fontFamily: 'Arial', fontSize: '14px', color: '#ffffff'
    }).setOrigin(0.5);
  }

  create() {
    // ── Player 1 — Axel (blue jacket, blonde) ────────────────
    this._makeSheet('player1', 32, 48, 6, (g, f) => {
      // Walk cycle: legs alternate, arms swing
      const legL = [0,3,5,2,0,-2][f];
      const legR = [0,-3,-5,-2,0,2][f];
      const armL = [0,-4,-6,-3,0,3][f];
      const armR = [0,4,6,3,0,-3][f];

      // Shadow
      g.fillStyle(0x000000, 0.2); g.fillEllipse(16, 46, 22, 5);

      // Legs
      g.fillStyle(0x2c3e70);
      g.fillRect(10, 32, 6, 14 + legL);   // left leg
      g.fillRect(17, 32, 6, 14 + legR);   // right leg

      // Shoes
      g.fillStyle(0x1a1a1a);
      g.fillRect(8,  44 + legL, 8, 4);
      g.fillRect(16, 44 + legR, 8, 4);

      // Belt
      g.fillStyle(0x8B4513);
      g.fillRect(8, 30, 17, 3);
      g.fillStyle(0xf4d03f);
      g.fillRect(13, 30, 4, 3);  // buckle

      // Jacket body
      g.fillStyle(0x457b9d);
      g.fillRect(8, 16, 17, 16);

      // Arms
      g.fillStyle(0x457b9d);
      g.fillRect(3,  17 + armL, 5, 12);  // left arm
      g.fillRect(25, 17 + armR, 5, 12);  // right arm

      // Fists
      g.fillStyle(0xf4a261);
      g.fillRect(3,  28 + armL, 5, 5);
      g.fillRect(25, 28 + armR, 5, 5);

      // Neck
      g.fillStyle(0xf4a261); g.fillRect(13, 12, 7, 5);

      // Head
      g.fillStyle(0xf4a261); g.fillRect(9, 2, 15, 13);

      // Hair (blonde)
      g.fillStyle(0xf0c040);
      g.fillRect(9, 2, 15, 4);
      g.fillRect(9, 2, 3, 7);   // sideburn

      // Eyes
      g.fillStyle(0x2c3e50);
      g.fillRect(11, 8, 3, 2);
      g.fillRect(18, 8, 3, 2);

      // Jacket collar
      g.fillStyle(0x2c5f7a);
      g.fillRect(8, 16, 4, 6);
      g.fillRect(21, 16, 4, 6);
    });

    // ── Player 2 — Blaze (red outfit, dark hair) ─────────────
    this._makeSheet('player2', 32, 48, 6, (g, f) => {
      const legL = [0,3,5,2,0,-2][f];
      const legR = [0,-3,-5,-2,0,2][f];
      const armL = [0,-3,-5,-2,0,2][f];
      const armR = [0,3,5,2,0,-2][f];

      // Shadow
      g.fillStyle(0x000000, 0.2); g.fillEllipse(16, 46, 22, 5);

      // Legs (red skirt area)
      g.fillStyle(0xc0392b);
      g.fillRect(9, 28, 15, 8);  // skirt

      // Leg stockings
      g.fillStyle(0x2c2c2c);
      g.fillRect(10, 34, 5, 12 + legL);
      g.fillRect(17, 34, 5, 12 + legR);

      // Boots
      g.fillStyle(0x1a0a0a);
      g.fillRect(8,  44 + legL, 8, 4);
      g.fillRect(16, 44 + legR, 8, 4);

      // Body
      g.fillStyle(0xe63946);
      g.fillRect(9, 14, 15, 15);

      // Arms
      g.fillStyle(0xe63946);
      g.fillRect(3,  15 + armL, 5, 12);
      g.fillRect(25, 15 + armR, 5, 12);

      // Gloves
      g.fillStyle(0xc0392b);
      g.fillRect(3,  26 + armL, 5, 5);
      g.fillRect(25, 26 + armR, 5, 5);

      // Neck
      g.fillStyle(0xf4a261); g.fillRect(13, 10, 7, 5);

      // Head
      g.fillStyle(0xf4a261); g.fillRect(9, 1, 15, 12);

      // Hair (dark, long)
      g.fillStyle(0x1a0a2e);
      g.fillRect(9, 1, 15, 5);
      g.fillRect(9, 1, 3, 10);
      g.fillRect(21, 1, 3, 10);
      g.fillRect(9, 10, 3, 8);   // hair flowing down left

      // Eyes
      g.fillStyle(0x1a0a2e);
      g.fillRect(11, 7, 3, 2);
      g.fillRect(18, 7, 3, 2);

      // Lips
      g.fillStyle(0xe63946);
      g.fillRect(13, 11, 5, 1);
    });

    // ── Enemy — Goon (street thug) ────────────────────────────
    this._makeSheet('enemy', 32, 48, 4, (g, f) => {
      const bob = [0,1,0,-1][f];

      // Shadow
      g.fillStyle(0x000000, 0.2); g.fillEllipse(16, 46, 20, 4);

      // Legs
      g.fillStyle(0x1a1a1a);
      g.fillRect(10, 32, 6, 14 + (f===1?2:0));
      g.fillRect(17, 32, 6, 14 + (f===3?2:0));

      // Boots
      g.fillStyle(0x0d0d0d);
      g.fillRect(8,  44 + (f===1?2:0), 9, 4);
      g.fillRect(16, 44 + (f===3?2:0), 9, 4);

      // Body (dark hoodie)
      g.fillStyle(0x2d3436);
      g.fillRect(8, 16 + bob, 17, 17);

      // Hoodie stripes
      g.fillStyle(0x636e72);
      g.fillRect(8,  16 + bob, 2, 17);
      g.fillRect(23, 16 + bob, 2, 17);

      // Arms
      g.fillStyle(0x2d3436);
      g.fillRect(2,  17 + bob, 6, 13);
      g.fillRect(25, 17 + bob, 6, 13);

      // Knuckles
      g.fillStyle(0x636e72);
      g.fillRect(2,  29 + bob, 6, 4);
      g.fillRect(25, 29 + bob, 6, 4);

      // Neck
      g.fillStyle(0x7f8c8d); g.fillRect(13, 12 + bob, 7, 5);

      // Head (bald/shaved)
      g.fillStyle(0x7f8c8d); g.fillRect(9, 1 + bob, 15, 13);

      // Stubble/shadow
      g.fillStyle(0x636e72);
      g.fillRect(9, 10 + bob, 15, 3);
      g.fillRect(9, 1 + bob, 15, 3);   // hair stubble

      // Eyes (menacing)
      g.fillStyle(0xc0392b);
      g.fillRect(10, 6 + bob, 4, 2);
      g.fillRect(19, 6 + bob, 4, 2);

      // Scar
      g.fillStyle(0xc0392b);
      g.fillRect(17, 4 + bob, 1, 6);

      // Hoodie hood outline
      g.fillStyle(0x1a1a1a);
      g.fillRect(8,  16 + bob, 17, 2);
    });

    // ── Enemy — Brute (big, heavy) ────────────────────────────
    this._makeSheet('brute', 40, 56, 4, (g, f) => {
      const bob = [0,1,0,-1][f];

      g.fillStyle(0x000000, 0.25); g.fillEllipse(20, 54, 30, 6);

      // Thick legs
      g.fillStyle(0x2c2c2c);
      g.fillRect(9,  36, 10, 16 + (f===1?2:0));
      g.fillRect(21, 36, 10, 16 + (f===3?2:0));

      g.fillStyle(0x1a1a1a);
      g.fillRect(7,  50 + (f===1?2:0), 13, 4);
      g.fillRect(20, 50 + (f===3?2:0), 13, 4);

      // Big body
      g.fillStyle(0x4a0000);
      g.fillRect(5, 16 + bob, 30, 22);

      // Tank top straps
      g.fillStyle(0x800000);
      g.fillRect(5,  16 + bob, 8, 22);
      g.fillRect(27, 16 + bob, 8, 22);

      // Huge arms
      g.fillStyle(0x8B4513);
      g.fillRect(0,  17 + bob, 8, 18);
      g.fillRect(32, 17 + bob, 8, 18);

      g.fillStyle(0x6B3410);
      g.fillRect(0,  34 + bob, 8, 6);
      g.fillRect(32, 34 + bob, 8, 6);

      // Neck (thick)
      g.fillStyle(0x8B4513); g.fillRect(14, 10 + bob, 12, 7);

      // Big head
      g.fillStyle(0x8B4513); g.fillRect(10, 1 + bob, 20, 12);

      // Mohawk
      g.fillStyle(0xe63946);
      g.fillRect(18, 0 + bob, 4, 4);

      // Eyes (angry)
      g.fillStyle(0xffffff);
      g.fillRect(12, 5 + bob, 5, 3);
      g.fillRect(23, 5 + bob, 5, 3);
      g.fillStyle(0x000000);
      g.fillRect(14, 5 + bob, 2, 3);
      g.fillRect(25, 5 + bob, 2, 3);

      // Chain necklace
      g.fillStyle(0xf4d03f);
      for (let i = 0; i < 5; i++) g.fillRect(12 + i*3, 16 + bob, 2, 2);
    });

    // ── Enemy — Boss (Mr. X style) ────────────────────────────
    this._makeSheet('boss', 40, 60, 4, (g, f) => {
      const bob = [0,1,0,-1][f];

      g.fillStyle(0x000000, 0.3); g.fillEllipse(20, 58, 32, 7);

      // Suit legs
      g.fillStyle(0x1a0a2e);
      g.fillRect(10, 38, 9, 18 + (f===1?2:0));
      g.fillRect(21, 38, 9, 18 + (f===3?2:0));

      // Dress shoes
      g.fillStyle(0x0a0a0a);
      g.fillRect(8,  54 + (f===1?2:0), 12, 4);
      g.fillRect(20, 54 + (f===3?2:0), 12, 4);

      // Suit body
      g.fillStyle(0x1a0a2e);
      g.fillRect(6, 18 + bob, 28, 22);

      // Shirt / tie
      g.fillStyle(0xffffff);
      g.fillRect(15, 18 + bob, 10, 22);
      g.fillStyle(0xe63946);
      g.fillRect(18, 18 + bob, 4, 20);  // tie

      // Suit lapels
      g.fillStyle(0x0d0520);
      g.fillRect(6,  18 + bob, 9, 12);
      g.fillRect(25, 18 + bob, 9, 12);

      // Arms (suit sleeves)
      g.fillStyle(0x1a0a2e);
      g.fillRect(0,  18 + bob, 8, 18);
      g.fillRect(32, 18 + bob, 8, 18);

      // White cuffs
      g.fillStyle(0xffffff);
      g.fillRect(0,  34 + bob, 8, 3);
      g.fillRect(32, 34 + bob, 8, 3);

      // Gloved fists
      g.fillStyle(0x1a1a1a);
      g.fillRect(0,  36 + bob, 8, 6);
      g.fillRect(32, 36 + bob, 8, 6);

      // Neck
      g.fillStyle(0xe8c99a); g.fillRect(15, 12 + bob, 10, 7);

      // Head
      g.fillStyle(0xe8c99a); g.fillRect(10, 1 + bob, 20, 13);

      // Hat (fedora)
      g.fillStyle(0x0d0520);
      g.fillRect(8,  0 + bob, 24, 5);   // brim
      g.fillRect(12, -3 + bob, 16, 5);  // crown

      // Eyes (intimidating)
      g.fillStyle(0x1a1a1a);
      g.fillRect(13, 7 + bob, 4, 3);
      g.fillRect(23, 7 + bob, 4, 3);

      // Cigar
      g.fillStyle(0xf4a261);
      g.fillRect(26, 11 + bob, 7, 2);
      g.fillStyle(0xe63946);
      g.fillRect(32, 11 + bob, 2, 2);  // ember
    });

    // ── Ground tile (cobblestone street) ─────────────────────
    this._makeTile('ground', 32, 32, (g) => {
      g.fillStyle(0x5a4a3a); g.fillRect(0, 0, 32, 32);
      // Cobblestone pattern
      const stones = [[0,0,14,12],[16,0,14,12],[0,14,10,12],[12,14,18,12],[0,28,32,4]];
      stones.forEach(([x,y,w,h]) => {
        g.fillStyle(0x6b5a48); g.fillRect(x+1, y+1, w-2, h-2);
        g.fillStyle(0x7a6858); g.fillRect(x+1, y+1, w-2, 2);  // highlight
        g.lineStyle(1, 0x4a3a2a, 1); g.strokeRect(x, y, w, h);
      });
    });

    // ── Sidewalk tile ─────────────────────────────────────────
    this._makeTile('sidewalk', 32, 16, (g) => {
      g.fillStyle(0x8a8070); g.fillRect(0, 0, 32, 16);
      g.fillStyle(0x9a9080); g.fillRect(1, 1, 30, 6);
      g.lineStyle(1, 0x6a6060); g.strokeRect(0, 0, 32, 16);
    });

    SocketManager.connect();
    this.scene.start('MenuScene');
  }

  // ── Build spritesheet with named frames 0..n ──────────────
  _makeSheet(key, fw, fh, frameCount, drawFn) {
    for (let i = 0; i < frameCount; i++) {
      const g = this.make.graphics({ add: false });
      drawFn(g, i);
      g.generateTexture(`__tmp_${key}_${i}`, fw, fh);
      g.destroy();
    }

    const rt = this.add.renderTexture(0, 0, fw * frameCount, fh).setVisible(false);
    for (let i = 0; i < frameCount; i++) rt.draw(`__tmp_${key}_${i}`, fw * i, 0);
    rt.saveTexture(key);

    const tex = this.textures.get(key);
    for (let i = 0; i < frameCount; i++) tex.add(i, 0, fw * i, 0, fw, fh);

    rt.destroy();
    for (let i = 0; i < frameCount; i++) this.textures.remove(`__tmp_${key}_${i}`);
  }

  // ── Build a single static tile texture ────────────────────
  _makeTile(key, w, h, drawFn) {
    const g = this.make.graphics({ add: false });
    drawFn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
