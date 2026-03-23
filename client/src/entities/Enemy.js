import Phaser from 'phaser';

const S = { PATROL:'patrol', CHASE:'chase', ATTACK:'attack', HURT:'hurt', DEAD:'dead' };

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type='goon') {
    const typeConfig = {
      goon:  { texture:'enemy', w:32, h:48 },
      brute: { texture:'brute', w:40, h:56 },
      boss:  { texture:'boss',  w:40, h:60 },
    };
    const cfg = typeConfig[type] || typeConfig.goon;

    super(scene, x, y, cfg.texture, 0);
    this.type    = type;
    this._state  = S.PATROL;
    this._facing = -1;

    const stats = {
      goon:  { hp:30,  speed:80,  damage:8,  score:100,  aRange:50, dRange:250 },
      brute: { hp:80,  speed:55,  damage:18, score:250,  aRange:65, dRange:200 },
      boss:  { hp:200, speed:90,  damage:25, score:1000, aRange:70, dRange:400 },
    };
    const s = stats[type] || stats.goon;
    this.maxHealth   = s.hp;
    this.health      = s.hp;
    this.speed       = s.speed;
    this.damage      = s.damage;
    this.scoreValue  = s.score;
    this.attackRange = s.aRange;
    this.detectRange = s.dRange;

    this._attackCD = 0; this._hurtCD = 0; this._patrolT = 0;
    this.ATTACK_CD = type === 'boss' ? 900 : 1200;
    this.HURT_DUR  = 400;
    this.PATROL_CHANGE = 2000;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(cfg.w - 8, cfg.h - 8).setOffset(4, 4);
    this.setCollideWorldBounds(true).setDepth(9);

    if (type === 'boss') {
      this._nameTag = scene.add.text(x, y - 48, '⚠ MR. X', {
        fontFamily: 'Arial Black', fontSize: '11px',
        color: '#e63946', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(10);
    }

    this._hpBar = scene.add.graphics().setDepth(10);
    this._drawHP();
    this._buildAnims(cfg.texture);
    this.play(`${cfg.texture}_walk`, true);
  }

  update(time, delta, targets) {
    if (this._state === S.DEAD) return;
    this._drawHP();
    if (this._nameTag) this._nameTag.setPosition(this.x, this.y - 48);
    if (this._attackCD > 0) this._attackCD -= delta;
    if (this._hurtCD > 0)   this._hurtCD   -= delta;
    if (this._state === S.HURT) return;

    let closest = null, minD = Infinity;
    targets.forEach(t => {
      if (!t?.active) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
      if (d < minD) { minD = d; closest = t; }
    });

    if (!closest) { this._patrol(delta); return; }

    if (minD <= this.attackRange)      this._setState(S.ATTACK);
    else if (minD <= this.detectRange) this._setState(S.CHASE);
    else                               this._setState(S.PATROL);

    if      (this._state === S.PATROL) this._patrol(delta);
    else if (this._state === S.CHASE)  this._chase(closest);
    else if (this._state === S.ATTACK) this._attack(closest);
  }

  _patrol(delta) {
    this._patrolT += delta;
    if (this._patrolT >= this.PATROL_CHANGE) { this._patrolT = 0; this._facing *= -1; }
    this.setVelocityX(this._facing * this.speed * 0.4);
    this.setFlipX(this._facing < 0);
    this.play(`${this.texture.key}_walk`, true);
  }

  _chase(t) {
    const d = t.x < this.x ? -1 : 1;
    this._facing = d;
    this.setVelocityX(d * this.speed);
    this.setFlipX(d < 0);
    this.play(`${this.texture.key}_walk`, true);
  }

  _attack(t) {
    this.setVelocityX(0);
    if (this._attackCD > 0) return;
    this._attackCD = this.ATTACK_CD;
    this.play(`${this.texture.key}_attack`, true);
    this.scene.time.delayedCall(200, () => {
      if (!this.active) return;
      if (Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y) <= this.attackRange + 15) {
        t.takeHit(this.damage);
      }
    });
  }

  takeHit(damage, attacker) {
    if (this._hurtCD > 0 || this._state === S.DEAD) return;
    this.health = Math.max(0, this.health - damage);
    this._hurtCD = this.HURT_DUR;
    this._setState(S.HURT);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => { if (this.active) this.clearTint(); });

    const dir = attacker ? (attacker.x < this.x ? 1 : -1) : 1;
    this.setVelocityX(dir * 220);
    this.setVelocityY(-180);

    if (this.health <= 0 && attacker?.score !== undefined) {
      attacker.score += this.scoreValue;
      this.scene.events.emit('score:updated', {
        playerIndex: attacker.playerIndex,
        score: attacker.score,
      });
    }

    this.scene.time.delayedCall(this.HURT_DUR, () => {
      if (this.active && this._state === S.HURT) this._setState(S.PATROL);
    });

    if (this.health <= 0) this._die();
  }

  _die() {
    this._setState(S.DEAD);
    this.setVelocityX(0);
    this.scene.events.emit('enemy:died', { enemy: this });
    this.scene.tweens.add({
      targets: this,
      angle: 180, alpha: 0, y: this.y + 20,
      duration: 500,
      onComplete: () => {
        this._hpBar?.destroy();
        this._nameTag?.destroy();
        this.destroy();
      }
    });
    if (this._hpBar) {
      this.scene.tweens.add({ targets: this._hpBar, alpha: 0, duration: 300 });
    }
  }

  _setState(s) {
    if (this._state === s || this._state === S.DEAD) return;
    this._state = s;
  }

  _drawHP() {
    const bw = this.type === 'boss' ? 50 : 36;
    const bh = this.type === 'boss' ? 6 : 4;
    const x = this.x - bw / 2;
    const y = this.y - 34;
    const pct = this.health / this.maxHealth;
    this._hpBar.clear();
    this._hpBar.fillStyle(0x000000, 0.6); this._hpBar.fillRect(x-1, y-1, bw+2, bh+2);
    this._hpBar.fillStyle(0x333333);      this._hpBar.fillRect(x, y, bw, bh);
    const col = pct > 0.6 ? 0xe63946 : pct > 0.3 ? 0xf4a261 : 0xf4d03f;
    this._hpBar.fillStyle(col);           this._hpBar.fillRect(x, y, bw * pct, bh);
  }

  _buildAnims(key) {
    if (!this.scene.anims.exists(`${key}_walk`)) {
      this.scene.anims.create({
        key: `${key}_walk`,
        frames: [0, 1, 2, 3].map(i => ({ key, frame: i })),
        frameRate: key === 'boss' ? 5 : 6,
        repeat: -1,
      });
    }
    if (!this.scene.anims.exists(`${key}_attack`)) {
      this.scene.anims.create({
        key: `${key}_attack`,
        frames: [{ key, frame: 2 }, { key, frame: 3 }, { key, frame: 2 }],
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  destroy() {
    this._hpBar?.destroy();
    this._nameTag?.destroy();
    super.destroy();
  }
}
