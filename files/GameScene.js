import Phaser from 'phaser';
import { Player }        from '../entities/Player.js';
import { Enemy }         from '../entities/Enemy.js';
import { SocketManager } from '../network/SocketManager.js';

const WAVES = [
  [{ type:'goon',x:700,y:370 },{ type:'goon',x:800,y:370 }],
  [{ type:'goon',x:700,y:370 },{ type:'goon',x:800,y:360 },{ type:'brute',x:950,y:355 }],
  [{ type:'boss',x:900,y:348 },{ type:'goon',x:780,y:370 },{ type:'goon',x:820,y:370 }],
];

// Ground Y — the top of the ground platform
const GROUND_Y   = 390;
const GROUND_H   = 60;

export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this._mode      = data.mode || 'solo';
    this._roomCode  = data.roomCode || null;
    this._waveIndex = 0;
    this._enemiesLeft = 0;
    this._gameOver  = false;
    this._netTick   = 0;
    this.NET_HZ     = 60;
  }

  create() {
    const { width, height } = this.scale;
    const WORLD_W = 2400;

    this.physics.world.setBounds(0, 0, WORLD_W, height);
    this.cameras.main.setBounds(0, 0, WORLD_W, height);

    // ── Build background layers (all anchored to ground) ─────
    this._buildBackground(WORLD_W, height);

    // ── Ground platform ──────────────────────────────────────
    this._ground = this.physics.add.staticGroup();
    for (let tx = 0; tx < WORLD_W; tx += 32) {
      // Cobblestone street
      const tile = this._ground.create(tx + 16, GROUND_Y + 16, 'ground');
      tile.setDepth(3);
    }
    this._ground.refresh();

    // ── Players ──────────────────────────────────────────────
    this._players = [];
    this._localIdx = SocketManager.playerIndex ?? 0;

    const spawnY = GROUND_Y - 30;
    const p1 = new Player(this, 150, spawnY, 'player1', 0, this._localIdx === 0);
    this._players.push(p1);

    if (this._mode !== 'solo') {
      const p2 = new Player(this, 210, spawnY, 'player2', 1, this._localIdx === 1);
      this._players.push(p2);
    }

    // ── Enemies group ─────────────────────────────────────────
    this._enemies = this.add.group();

    // ── Colliders ─────────────────────────────────────────────
    this._players.forEach(p => this.physics.add.collider(p, this._ground));

    // ── Camera follows local player ───────────────────────────
    const local = this._players[this._localIdx] ?? this._players[0];
    this.cameras.main.startFollow(local, true, 0.08, 0.08);

    // ── Events ────────────────────────────────────────────────
    this.events.on('player:attack',        this._onAttack,    this);
    this.events.on('player:healthChanged', this._onHPChanged, this);
    this.events.on('enemy:died',           this._onEnemyDied, this);
    this.events.on('game:over',            this._onGameOver,  this);
    this.events.on('score:updated',        this._onScore,     this);

    if (this._mode !== 'solo') {
      SocketManager.on('player:update', this._onRemote.bind(this));
    }

    this._spawnWave(0);

    this.events.emit('hud:init', {
      players: this._players.map(p => ({
        playerIndex: p.playerIndex,
        health: p.health,
        lives:  p.lives,
        score:  p.score,
      }))
    });
  }

  // ──────────────────────────────────────────────────────────
  //  LAYERED BACKGROUND
  //  Layer order (depth):
  //   0 = sky gradient
  //   1 = far buildings (slow parallax)
  //   2 = mid buildings + neon signs
  //   3 = ground / street
  //   4 = foreground trim
  // ──────────────────────────────────────────────────────────
  _buildBackground(worldW, height) {
    // ── Layer 0: Sky gradient ──────────────────────────────
    const sky = this.add.graphics().setDepth(0).setScrollFactor(0);
    sky.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a1a3e, 0x1a1a3e, 1);
    sky.fillRect(0, 0, 800, height);  // covers viewport (scrollFactor 0)

    // ── Moon ──────────────────────────────────────────────
    const moon = this.add.graphics().setDepth(0).setScrollFactor(0.05);
    moon.fillStyle(0xfff9e6, 1);
    moon.fillCircle(680, 60, 28);
    moon.fillStyle(0xf0e0b0, 0.4);
    moon.fillCircle(680, 60, 34);
    // craters
    moon.fillStyle(0xe8d48a, 0.5);
    moon.fillCircle(672, 55, 6);
    moon.fillCircle(688, 68, 4);

    // ── Stars ──────────────────────────────────────────────
    const stars = this.add.graphics().setDepth(0).setScrollFactor(0.02);
    for (let i = 0; i < 120; i++) {
      const sx = Phaser.Math.Between(0, worldW);
      const sy = Phaser.Math.Between(0, GROUND_Y - 180);
      const br = Math.random();
      stars.fillStyle(0xffffff, 0.3 + br * 0.7);
      stars.fillRect(sx, sy, br > 0.85 ? 2 : 1, br > 0.85 ? 2 : 1);
    }

    // ── Layer 1: Far buildings (dim, slow parallax) ─────────
    const farBldg = this.add.graphics().setDepth(1).setScrollFactor(0.15);
    for (let bx = 0; bx < worldW; bx += 90) {
      const bh = Phaser.Math.Between(80, 200);
      const bw = Phaser.Math.Between(55, 80);
      const by = GROUND_Y - bh;
      farBldg.fillStyle(0x0d0d2e, 1);
      farBldg.fillRect(bx, by, bw, bh);
      // far windows (dim)
      farBldg.fillStyle(0xf4a261, 0.15);
      for (let wy = by + 8; wy < GROUND_Y - 10; wy += 18) {
        for (let wx = bx + 6; wx < bx + bw - 6; wx += 14) {
          if (Math.random() > 0.45) farBldg.fillRect(wx, wy, 8, 9);
        }
      }
    }

    // ── Layer 2: Mid buildings + neon signs ────────────────
    const midBldg = this.add.graphics().setDepth(2).setScrollFactor(0.35);
    for (let bx = 20; bx < worldW; bx += 110) {
      const bh = Phaser.Math.Between(100, 240);
      const bw = Phaser.Math.Between(70, 100);
      const by = GROUND_Y - bh;

      // Building body
      midBldg.fillStyle(0x12123a, 1);
      midBldg.fillRect(bx, by, bw, bh);

      // Building edge highlights
      midBldg.fillStyle(0x1e1e50, 1);
      midBldg.fillRect(bx, by, 3, bh);
      midBldg.fillRect(bx + bw - 3, by, 3, bh);

      // Rooftop trim
      midBldg.fillStyle(0x2a2a60, 1);
      midBldg.fillRect(bx - 2, by, bw + 4, 6);

      // Windows (lit)
      for (let wy = by + 14; wy < GROUND_Y - 12; wy += 20) {
        for (let wx = bx + 8; wx < bx + bw - 8; wx += 16) {
          if (Math.random() > 0.3) {
            // Window frame
            midBldg.fillStyle(0x2a2a50, 1);
            midBldg.fillRect(wx - 1, wy - 1, 12, 13);
            // Window glow
            const warmth = Math.random();
            const winColor = warmth > 0.6 ? 0xf4e4a0 : warmth > 0.3 ? 0xa0c4f4 : 0xf4a261;
            midBldg.fillStyle(winColor, 0.7 + Math.random() * 0.3);
            midBldg.fillRect(wx, wy, 10, 11);
            // Window reflection
            midBldg.fillStyle(0xffffff, 0.3);
            midBldg.fillRect(wx, wy, 3, 3);
          }
        }
      }

      // Neon signs (random on some buildings)
      if (Math.random() > 0.55) {
        const neonColors = [0xe63946, 0x00c8ff, 0x39e63e, 0xf4a261, 0xff00ff];
        const nc = neonColors[Math.floor(Math.random() * neonColors.length)];
        const sy = by + Phaser.Math.Between(20, bh - 30);
        midBldg.lineStyle(3, nc, 0.9);
        midBldg.strokeRect(bx + 8, sy, bw - 16, 14);
        midBldg.fillStyle(nc, 0.2);
        midBldg.fillRect(bx + 8, sy, bw - 16, 14);
      }
    }

    // ── Layer 3: Street surface ───────────────────────────
    const street = this.add.graphics().setDepth(3).setScrollFactor(1);

    // Sidewalk
    street.fillStyle(0x706050, 1);
    street.fillRect(0, GROUND_Y - 10, worldW, 10);  // sidewalk edge

    // Road
    street.fillStyle(0x252525, 1);
    street.fillRect(0, GROUND_Y, worldW, GROUND_H);

    // Road lines
    street.fillStyle(0xf4d03f, 0.6);
    for (let lx = 0; lx < worldW; lx += 80) {
      street.fillRect(lx, GROUND_Y + GROUND_H/2 - 2, 48, 4);
    }

    // Kerb highlight
    street.fillStyle(0x9a8878, 1);
    street.fillRect(0, GROUND_Y - 12, worldW, 4);

    // ── Layer 4: Foreground poles + details ───────────────
    const fg = this.add.graphics().setDepth(4).setScrollFactor(1);
    for (let px = 120; px < worldW; px += 280) {
      // Street lamp pole
      fg.fillStyle(0x404040, 1);
      fg.fillRect(px, GROUND_Y - 90, 6, 90);

      // Lamp head
      fg.fillStyle(0x505050, 1);
      fg.fillRect(px - 10, GROUND_Y - 95, 26, 8);

      // Lamp glow
      fg.fillStyle(0xfff4a0, 0.9);
      fg.fillRect(px - 8, GROUND_Y - 92, 22, 5);

      // Glow radius
      fg.fillStyle(0xfff4a0, 0.06);
      fg.fillCircle(px + 3, GROUND_Y - 90, 40);
    }

    // Fire hydrants
    for (let hx = 200; hx < worldW; hx += 350) {
      fg.fillStyle(0xe63946, 1);
      fg.fillRect(hx, GROUND_Y - 16, 10, 16);
      fg.fillStyle(0xc0392b, 1);
      fg.fillRect(hx - 2, GROUND_Y - 10, 14, 6);
      fg.fillStyle(0xff6b6b, 1);
      fg.fillRect(hx + 2, GROUND_Y - 16, 6, 3);
    }

    // Graffiti on ground level walls (far buildings)
    const graffiti = ['▲▼◆', '✦✧✦', '⬡⬢⬡'];
    const grafColors = [0xe63946, 0x00c8ff, 0x39e63e];
    for (let gx = 300; gx < worldW; gx += 400) {
      const gLabel = graffiti[Math.floor(Math.random() * graffiti.length)];
      const gColor = grafColors[Math.floor(Math.random() * grafColors.length)];
      this.add.text(gx, GROUND_Y - 55, gLabel, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#' + gColor.toString(16).padStart(6, '0'),
        alpha: 0.4,
      }).setDepth(2).setScrollFactor(0.35);
    }
  }

  // ──────────────────────────────────────────────────────────
  //  UPDATE
  // ──────────────────────────────────────────────────────────
  update(time, delta) {
    if (this._gameOver) return;
    this._players.forEach(p => p.update(time, delta));

    const alive = this._players.filter(p => p.active && p.health > 0);
    this._enemies.getChildren().forEach(e => {
      if (e.active) {
        e.update(time, delta, alive);
        this.physics.add.collider(e, this._ground);
      }
    });

    if (this._mode !== 'solo') {
      this._netTick += delta;
      if (this._netTick >= this.NET_HZ) {
        this._netTick = 0;
        const lp = this._players[this._localIdx];
        if (lp) SocketManager.sendPlayerState(lp.getNetworkState());
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  //  WAVES
  // ──────────────────────────────────────────────────────────
  _spawnWave(idx) {
    if (idx >= WAVES.length) { this._onLevelClear(); return; }
    this._waveIndex   = idx;
    this._enemiesLeft = WAVES[idx].length;

    const { width, height } = this.scale;
    const cam = this.cameras.main;

    const txt = this.add.text(
      cam.scrollX + width/2, height/2 - 50,
      `— WAVE ${idx + 1} —`,
      { fontFamily:'Arial Black', fontSize:'44px', color:'#e63946', stroke:'#000', strokeThickness:8 }
    ).setOrigin(0.5).setDepth(50);

    this.tweens.add({ targets:txt, alpha:0, duration:1400, delay:600, onComplete:()=>txt.destroy() });

    WAVES[idx].forEach(({ type, x, y }, i) => {
      this.time.delayedCall(1000 + i * 450, () => {
        const textureKey = type === 'brute' ? 'brute' : type === 'boss' ? 'boss' : 'enemy';
        const e = new Enemy(this, x, y, type);
        this._enemies.add(e);
        this.physics.add.collider(e, this._ground);
      });
    });
  }

  // ──────────────────────────────────────────────────────────
  //  EVENT HANDLERS
  // ──────────────────────────────────────────────────────────
  _onAttack(box) {
    this._enemies.getChildren().forEach(e => {
      if (!e.active) return;
      if (Phaser.Geom.Rectangle.Overlaps(box.getBounds(), e.getBounds())) {
        e.takeHit(box.damage, box.owner);
      }
    });
  }

  _onEnemyDied() {
    this._enemiesLeft--;
    if (this._enemiesLeft <= 0) {
      this.time.delayedCall(1500, () => this._spawnWave(this._waveIndex + 1));
    }
  }

  _onHPChanged(data) { this.scene.get('HUDScene')?.events.emit('player:healthChanged', data); }
  _onScore(data)     { this.scene.get('HUDScene')?.events.emit('score:updated', data); }

  _onGameOver() {
    this._gameOver = true;
    this.time.delayedCall(2000, () => {
      this.scene.stop('HUDScene');
      this.scene.start('GameOverScene', {
        scores: this._players.map(p => ({ playerIndex: p.playerIndex, score: p.score }))
      });
    });
  }

  _onLevelClear() {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    this.add.text(cam.scrollX + width/2, height/2, 'STAGE CLEAR! 🏆', {
      fontFamily: 'Arial Black', fontSize: '52px', color: '#00c853', stroke: '#000', strokeThickness:8
    }).setOrigin(0.5).setDepth(50);
    this.time.delayedCall(3000, () => {
      this.scene.stop('HUDScene');
      this.scene.start('GameOverScene', {
        win: true,
        scores: this._players.map(p => ({ playerIndex: p.playerIndex, score: p.score }))
      });
    });
  }

  _onRemote({ state }) {
    const ri = this._localIdx === 0 ? 1 : 0;
    const r  = this._players[ri];
    if (r) r.applyRemoteState(state);
  }

  shutdown() { SocketManager.offAll('player:update'); }
}
