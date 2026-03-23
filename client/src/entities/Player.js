import Phaser from 'phaser';

const S = { IDLE:'idle', WALK:'walk', JUMP:'jump', ATTACK1:'attack1', ATTACK2:'attack2', HURT:'hurt', DEAD:'dead' };

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, playerIndex, isLocal=true) {
    super(scene, x, y, texture, 0);
    this.playerIndex=playerIndex; this.isLocal=isLocal;
    this.maxHealth=100; this.health=100; this.lives=3; this.score=0;
    this._state=S.IDLE; this._facing=1; this._attackBox=null;
    this._attackCD=0; this._hurtCD=0; this._attackDur=0;
    this.ATTACK_CD=400; this.ATTACK_DUR=200; this.HURT_DUR=300;
    this.WALK_SPEED=180; this.JUMP_FORCE=-500;

    scene.add.existing(this); scene.physics.add.existing(this);
    this.body.setSize(24,40).setOffset(4,8);
    this.setCollideWorldBounds(true).setDepth(10);

    this._label = scene.add.text(x, y-30, `P${playerIndex+1}`, { fontFamily:'Arial', fontSize:'11px', color: playerIndex===0?'#457b9d':'#e63946', stroke:'#000', strokeThickness:2 }).setOrigin(0.5).setDepth(11);
    this._hpBar = scene.add.graphics().setDepth(11);
    this._buildAnims(texture);

    if (isLocal) {
      this._cursors = scene.input.keyboard.createCursorKeys();
      this._wasd    = scene.input.keyboard.addKeys({ up:'W', down:'S', left:'A', right:'D' });
      this._punch   = scene.input.keyboard.addKey('Z');
      this._kick    = scene.input.keyboard.addKey('X');
    }
  }

  update(time, delta) {
    if (this._state===S.DEAD) return;
    this._label.setPosition(this.x, this.y-35);
    this._drawHP();
    if (this._attackCD>0)  this._attackCD  -= delta;
    if (this._hurtCD>0)    this._hurtCD    -= delta;
    if (this._attackDur>0) { this._attackDur-=delta; if (this._attackDur<=0) this._clearBox(); }
    if (!this.isLocal) return;
    this._handleInput();
  }

  _handleInput() {
    if (this._state===S.HURT||this._state===S.ATTACK1||this._state===S.ATTACK2) return;
    const left  = this._cursors.left.isDown  || this._wasd.left.isDown;
    const right = this._cursors.right.isDown || this._wasd.right.isDown;
    const up    = this._cursors.up.isDown    || this._wasd.up.isDown;
    const punch = Phaser.Input.Keyboard.JustDown(this._punch);
    const kick  = Phaser.Input.Keyboard.JustDown(this._kick);
    if (punch && this._attackCD<=0) { this._doAttack(S.ATTACK1); return; }
    if (kick  && this._attackCD<=0) { this._doAttack(S.ATTACK2); return; }
    if (up && this.body.blocked.down) { this.setVelocityY(this.JUMP_FORCE); this._setState(S.JUMP); }
    if (left)       { this.setVelocityX(-this.WALK_SPEED); this._facing=-1; this.setFlipX(true);  if (this.body.blocked.down) this._setState(S.WALK); }
    else if (right) { this.setVelocityX(this.WALK_SPEED);  this._facing=1;  this.setFlipX(false); if (this.body.blocked.down) this._setState(S.WALK); }
    else            { this.setVelocityX(0); if (this.body.blocked.down) this._setState(S.IDLE); }
    if (!this.body.blocked.down) this._setState(S.JUMP);
    else if (this._state===S.JUMP) this._setState(S.IDLE);
  }

  _doAttack(type) {
    this._setState(type); this._attackCD=this.ATTACK_CD; this._attackDur=this.ATTACK_DUR;
    const box = this.scene.add.zone(this.x+this._facing*36, this.y, 40, 36).setDepth(5);
    this.scene.physics.add.existing(box);
    box.damage = type===S.ATTACK1 ? 10 : 15;
    box.owner  = this;
    this._attackBox = box;
    this.scene.events.emit('player:attack', box);
    this.scene.time.delayedCall(this.ATTACK_DUR, () => { if (this._state===type) this._setState(S.IDLE); });
  }

  _clearBox() { if (this._attackBox) { this._attackBox.destroy(); this._attackBox=null; } }

  takeHit(damage) {
    if (this._hurtCD>0||this._state===S.DEAD) return;
    this.health = Math.max(0, this.health-damage);
    this._hurtCD = this.HURT_DUR;
    this._setState(S.HURT);
    this.scene.tweens.add({ targets:this, alpha:{from:0.3,to:1}, duration:80, repeat:3 });
    this.setVelocityX(-this._facing*120); this.setVelocityY(-150);
    this.scene.time.delayedCall(this.HURT_DUR, () => { if (this._state===S.HURT) this._setState(S.IDLE); });
    if (this.health<=0) this._die();
    this.scene.events.emit('player:healthChanged', { playerIndex:this.playerIndex, health:this.health });
  }

  _die() {
    this._setState(S.DEAD); this.lives--; this.setAlpha(0.3);
    this.scene.events.emit('player:died', { playerIndex:this.playerIndex, lives:this.lives });
    if (this.lives>0) this.scene.time.delayedCall(2000, () => { this.health=this.maxHealth; this._setState(S.IDLE); this.setAlpha(1); this.setPosition(200,300); this.scene.events.emit('player:healthChanged',{playerIndex:this.playerIndex,health:this.health}); });
    else this.scene.events.emit('game:over', { playerIndex:this.playerIndex });
  }

  applyRemoteState(s) { this.setPosition(s.x,s.y); this.setFlipX(s.flipX); this._setState(s.state); if (s.health!==this.health) { this.health=s.health; this.scene.events.emit('player:healthChanged',{playerIndex:this.playerIndex,health:this.health}); } }

  _setState(s) { if (this._state===s) return; this._state=s; const k=`${this.texture.key}_${s}`; if (this.scene.anims.exists(k)) this.play(k,true); }

  _buildAnims(key) {
    [['idle',[0],4,-1],['walk',[0,1,2,3],8,-1],['jump',[2],4,0],['attack1',[1,3],12,0],['attack2',[2,3],12,0],['hurt',[3],4,0],['dead',[3],4,0]].forEach(([s,f,r,rep]) => {
      const k=`${key}_${s}`;
      if (!this.scene.anims.exists(k)) this.scene.anims.create({ key:k, frames:f.map(n=>({key,frame:n})), frameRate:r, repeat:rep });
    });
  }

  _drawHP() {
    const bw=36,bh=5,x=this.x-bw/2,y=this.y-28,pct=this.health/this.maxHealth;
    this._hpBar.clear();
    this._hpBar.fillStyle(0x333333); this._hpBar.fillRect(x,y,bw,bh);
    this._hpBar.fillStyle(pct>0.5?0x00c853:pct>0.25?0xf4a261:0xe63946); this._hpBar.fillRect(x,y,bw*pct,bh);
  }

  getNetworkState() { return { x:this.x, y:this.y, flipX:this.flipX, state:this._state, health:this.health }; }
  destroy() { this._label?.destroy(); this._hpBar?.destroy(); this._clearBox(); super.destroy(); }
}
