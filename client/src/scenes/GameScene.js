import Phaser from 'phaser';
import { Player }        from '../entities/Player.js';
import { Enemy }         from '../entities/Enemy.js';
import { SocketManager } from '../network/SocketManager.js';

const WAVES = [
  [{ type:'goon',x:700,y:350 },{ type:'goon',x:750,y:350 }],
  [{ type:'goon',x:700,y:350 },{ type:'goon',x:800,y:340 },{ type:'brute',x:850,y:350 }],
  [{ type:'boss',x:900,y:340 },{ type:'goon',x:780,y:350 },{ type:'goon',x:820,y:350 }],
];

export class GameScene extends Phaser.Scene {
  constructor() { super({ key:'GameScene' }); }

  init(data) { this._mode=data.mode||'solo'; this._roomCode=data.roomCode||null; this._waveIndex=0; this._enemiesLeft=0; this._gameOver=false; this._netTick=0; this.NET_HZ=60; }

  create() {
    const { width, height } = this.scale;
    const WORLD_W = 2400;
    this.physics.world.setBounds(0,0,WORLD_W,height);
    this.cameras.main.setBounds(0,0,WORLD_W,height);
    this._buildBG(WORLD_W, height);

    this._ground = this.physics.add.staticGroup();
    for (let tx=0; tx<WORLD_W; tx+=32) this._ground.create(tx+16, height-16, 'ground');

    this._players = [];
    this._localIdx = SocketManager.playerIndex ?? 0;

    const p1 = new Player(this, 150, height-100, 'player1', 0, this._localIdx===0);
    this._players.push(p1);
    if (this._mode!=='solo') {
      const p2 = new Player(this, 200, height-100, 'player2', 1, this._localIdx===1);
      this._players.push(p2);
    }

    this._enemies = this.add.group();
    this._players.forEach(p => this.physics.add.collider(p, this._ground));
    this.cameras.main.startFollow(this._players[this._localIdx]??this._players[0], true, 0.1, 0.1);

    this.events.on('player:attack',        this._onAttack,       this);
    this.events.on('player:healthChanged', this._onHPChanged,    this);
    this.events.on('enemy:died',           this._onEnemyDied,    this);
    this.events.on('game:over',            this._onGameOver,     this);
    this.events.on('score:updated',        this._onScore,        this);

    if (this._mode!=='solo') SocketManager.on('player:update', this._onRemote.bind(this));

    this._spawnWave(0);
    this.events.emit('hud:init', { players: this._players.map(p=>({ playerIndex:p.playerIndex, health:p.health, lives:p.lives, score:p.score })) });
  }

  update(time, delta) {
    if (this._gameOver) return;
    this._players.forEach(p => p.update(time, delta));
    const alive = this._players.filter(p=>p.active&&p.health>0);
    this._enemies.getChildren().forEach(e => { if (e.active) { e.update(time,delta,alive); this.physics.add.collider(e,this._ground); } });
    if (this._mode!=='solo') {
      this._netTick+=delta;
      if (this._netTick>=this.NET_HZ) { this._netTick=0; const lp=this._players[this._localIdx]; if (lp) SocketManager.sendPlayerState(lp.getNetworkState()); }
    }
  }

  _buildBG(w, h) {
    const g=this.add.graphics();
    g.fillGradientStyle(0x1a1a2e,0x1a1a2e,0x2d3561,0x2d3561,1); g.fillRect(0,0,w,h*0.6);
    g.fillStyle(0x2c2c3e); g.fillRect(0,h*0.6,w,h);
    g.fillStyle(0x16213e);
    for (let bx=0; bx<w; bx+=80) { const bh=Phaser.Math.Between(60,160); g.fillRect(bx,h*0.6-bh,60,bh); }
    g.fillStyle(0xf4a261,0.5);
    for (let bx=0; bx<w; bx+=80) for (let wy=0;wy<4;wy++) for (let wx=0;wx<3;wx++) if (Math.random()>0.4) g.fillRect(bx+8+wx*16,h*0.6-140+wy*20,8,10);
    g.fillStyle(0xf4d03f,0.3);
    for (let mx=0; mx<w; mx+=100) g.fillRect(mx,h-50,50,6);
    g.setDepth(0).setScrollFactor(0.3);
  }

  _spawnWave(idx) {
    if (idx>=WAVES.length) { this._onLevelClear(); return; }
    this._waveIndex=idx;
    const wave=WAVES[idx];
    this._enemiesLeft=wave.length;
    const { width, height }=this.scale;
    const cam=this.cameras.main;
    const txt=this.add.text(cam.scrollX+width/2, height/2-40, `WAVE ${idx+1}`, { fontFamily:'Arial Black', fontSize:'48px', color:'#e63946', stroke:'#000', strokeThickness:8 }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets:txt, alpha:0, duration:1500, delay:500, onComplete:()=>txt.destroy() });
    wave.forEach(({ type,x,y }, i) => {
      this.time.delayedCall(1000+i*400, () => {
        const e=new Enemy(this,x,y,type);
        this._enemies.add(e);
        this.physics.add.collider(e,this._ground);
      });
    });
  }

  _onAttack(box) {
    this._enemies.getChildren().forEach(e => {
      if (!e.active) return;
      if (Phaser.Geom.Rectangle.Overlaps(box.getBounds(),e.getBounds())) e.takeHit(box.damage,box.owner);
    });
  }

  _onEnemyDied() { this._enemiesLeft--; if (this._enemiesLeft<=0) this.time.delayedCall(1500,()=>this._spawnWave(this._waveIndex+1)); }
  _onHPChanged(data) { this.scene.get('HUDScene')?.events.emit('player:healthChanged',data); }
  _onScore(data)     { this.scene.get('HUDScene')?.events.emit('score:updated',data); }
  _onGameOver(data)  { this._gameOver=true; this.time.delayedCall(2000,()=>{ this.scene.stop('HUDScene'); this.scene.start('GameOverScene',{ scores:this._players.map(p=>({playerIndex:p.playerIndex,score:p.score})) }); }); }
  _onLevelClear()    { const {width,height}=this.scale; const cam=this.cameras.main; this.add.text(cam.scrollX+width/2,height/2,'STAGE CLEAR!',{ fontFamily:'Arial Black', fontSize:'56px', color:'#00c853', stroke:'#000', strokeThickness:8 }).setOrigin(0.5).setDepth(50); this.time.delayedCall(3000,()=>{ this.scene.stop('HUDScene'); this.scene.start('GameOverScene',{ win:true, scores:this._players.map(p=>({playerIndex:p.playerIndex,score:p.score})) }); }); }
  _onRemote({ state }) { const ri=this._localIdx===0?1:0; const r=this._players[ri]; if (r) r.applyRemoteState(state); }
  shutdown() { SocketManager.offAll('player:update'); }
}
