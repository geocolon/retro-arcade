import { io } from 'socket.io-client';

class SocketManagerClass {
  constructor() {
    this._socket = null; this._listeners = {};
    this.playerIndex = 0; this.roomCode = null; this.isConnected = false;
  }
  connect() {
    if (this._socket) return;
    this._socket = io({ path: '/socket.io', transports: ['websocket','polling'], reconnectionAttempts: 5 });
    this._socket.on('connect',       () => { this.isConnected = true;  this._updateUI('connected'); });
    this._socket.on('disconnect',    () => { this.isConnected = false; this._updateUI('disconnected'); });
    this._socket.on('connect_error', () => this._updateUI('disconnected'));
    ['room:created','room:joined','room:error','game:start','game:over','player:update','enemy:sync'].forEach(ev => {
      this._socket.on(ev, data => (this._listeners[ev] || []).forEach(cb => cb(data)));
    });
    this._socket.on('room:joined',  ({ playerIndex }) => { this.playerIndex = playerIndex; });
    this._socket.on('room:created', ({ roomCode })    => { this.roomCode = roomCode; this.playerIndex = 0; });
  }
  emit(ev, data) { this._socket?.emit(ev, data); }
  on(ev, cb)  { if (!this._listeners[ev]) this._listeners[ev] = []; this._listeners[ev].push(cb); }
  off(ev, cb) { if (this._listeners[ev]) this._listeners[ev] = this._listeners[ev].filter(f => f !== cb); }
  offAll(ev)  { delete this._listeners[ev]; }
  sendPlayerState(state) { this.emit('player:update', { roomCode: this.roomCode, state }); }
  _updateUI(status) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    el.className = `status-${status}`;
    el.textContent = status === 'connected' ? '🟢 Online' : status === 'disconnected' ? '🔴 Offline' : '🟡 Connecting...';
  }
  get id() { return this._socket?.id ?? null; }
}
export const SocketManager = new SocketManagerClass();
