import Phaser from 'phaser';

const S = { PATROL:'patrol', CHASE:'chase', ATTACK:'attack', HURT:'hurt', DEAD:'dead' };

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type='goon') {
    super(scene, x, y, 'enemy', 0);
    this.type=type; this._state=S.PATROL; this._facing=-1;
    const stats={ goon:{hp:30,speed:80,damage:8,score:100,aRange:50,dRange:250}, brute:{hp:80,speed:60,damage:18,score:250,aRange:60,dRange:200}, boss:{hp:200,speed:90,damage:25,score:1000,aRange:70,dRange:400} };
    const s=stats[type]||stats.goon;
    this.maxHealth=s.hp; this.health=s.hp; this.speed=s.speed; this.damage=s.damage;
    this.scoreValue=s.score; this.attackRange=s.aRange; this.detectRange=s.dRange;
    this._attackCD=0; this._hurtCD=0; this._patrolT=0;
    this.ATTACK_CD=1200; this.HURT_DUR=400; this.PATROL_CHANGE=2000;
    scene.add.existing(this); scene.physics.add.existing(this);
    this.body.setSize(24,40).setOffset(4,8);
    this.setCollideWorldBounds(true).setDepth(9);
    this._hpBar=scene.add.graphics().setDepth(10);
    this._buildAnims(); this.play('enemy_patrol',true);
  }

  update(time, delta, targets) {
    if (this._state===S.DEAD) return;
    this._drawHP();
    if (this._attackCD>0) this._attackCD-=delta;
    if (this._hurtCD>0)   this._hurtCD-=delta;
    if (this._state===S.HURT) return;
    let closest=null, minD=Infinity;
    targets.forEach(t => { if (!t?.active) return; const d=Phaser.Math.Distance.Between(this.x,this.y,t.x,t.y); if (d<minD){minD=d;closest=t;} });
    if (!closest) { this._patrol(delta); return; }
    if (minD<=this.attackRange) this._setState(S.ATTACK);
    else if (minD<=this.detectRange) this._setState(S.CHASE);
    else this._setState(S.PATROL);
    if (this._state===S.PATROL) this._patrol(delta);
    else if (this._state===S.CHASE) this._chase(closest);
    else if (this._state===S.ATTACK) this._attack(closest);
  }

  _patrol(delta) { this._patrolT+=delta; if (this._patrolT>=this.PATROL_CHANGE){this._patrolT=0;this._facing*=-1;} this.setVelocityX(this._facing*this.speed*0.5); this.setFlipX(this._facing<0); this.play('enemy_patrol',true); }
  _chase(t) { const d=t.x<this.x?-1:1; this._facing=d; this.setVelocityX(d*this.speed); this.setFlipX(d<0); this.play('enemy_patrol',true); }
  _attack(t) {
    this.setVelocityX(0); if (this._attackCD>0) return;
    this._attackCD=this.ATTACK_CD; this.play('enemy_attack',true);
    this.scene.time.delayedCall(150, () => { if (Phaser.Math.Distance.Between(this.x,this.y,t.x,t.y)<=this.attackRange+10) t.takeHit(this.damage); });
  }

  takeHit(damage, attacker) {
    if (this._hurtCD>0||this._state===S.DEAD) return;
    this.health=Math.max(0,this.health-damage); this._hurtCD=this.HURT_DUR; this._setState(S.HURT);
    this.setTintFill(0xffffff); this.scene.time.delayedCall(80,()=>this.clearTint());
    const dir=attacker?(attacker.x<this.x?1:-1):1; this.setVelocityX(dir*200); this.setVelocityY(-200);
    if (this.health<=0 && attacker?.score!==undefined) { attacker.score+=this.scoreValue; this.scene.events.emit('score:updated',{playerIndex:attacker.playerIndex,score:attacker.score}); }
    this.scene.time.delayedCall(this.HURT_DUR,()=>{ if (this._state===S.HURT) this._setState(S.PATROL); });
    if (this.health<=0) this._die();
  }

  _die() {
    this._setState(S.DEAD); this.setVelocityX(0); this.scene.events.emit('enemy:died',{enemy:this});
    this.scene.tweens.add({ targets:[this,this._hpBar], alpha:0, duration:600, onComplete:()=>{ this._hpBar.destroy(); this.destroy(); } });
  }

  _setState(s) { if (this._state===s||this._state===S.DEAD) return; this._state=s; }

  _drawHP() {
    const bw=36,bh=4,x=this.x-bw/2,y=this.y-30,pct=this.health/this.maxHealth;
    this._hpBar.clear();
    this._hpBar.fillStyle(0x333333); this._hpBar.fillRect(x,y,bw,bh);
    this._hpBar.fillStyle(0xe63946); this._hpBar.fillRect(x,y,bw*pct,bh);
  }

  _buildAnims() {
    if (!this.scene.anims.exists('enemy_patrol')) this.scene.anims.create({ key:'enemy_patrol', frames:[{key:'enemy',frame:0},{key:'enemy',frame:1}], frameRate:6, repeat:-1 });
    if (!this.scene.anims.exists('enemy_attack')) this.scene.anims.create({ key:'enemy_attack', frames:[{key:'enemy',frame:2},{key:'enemy',frame:3}], frameRate:10, repeat:0 });
  }

  destroy() { this._hpBar?.destroy(); super.destroy(); }
}
