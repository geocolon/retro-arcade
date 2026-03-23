import { io } from 'socket.io-client';

class SocketManagerClass {
  constructor() {
    this._socket = null; this._listeners = {};
    this.playerIndex = 0; this.roomCode = null; this.isConnected = false;
  }

  connect() {
    if (this._socket) return;

    // In dev: connect directly to server port 4000
    // In prod: connect to same origin (nginx proxies /socket.io)
    const serverURL = import.meta.env.DEV
      ? 'http://localhost:4000'
      : window.location.origin;

    this._socket = io(serverURL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this._socket.on('connect',       () => { this.isConnected = true;  this._updateUI('connected');    console.log('[Socket] Connected'); });
    this._socket.on('disconnect',    () => { this.isConnected = false; this._updateUI('disconnected'); console.log('[Socket] Disconnected'); });
    this._socket.on('connect_error', (e) => { this._updateUI('disconnected'); console.warn('[Socket] Error:', e.message); });

    ['room:created','room:joined','room:error','game:start','game:over','player:update'].forEach(ev => {
      this._socket.on(ev, data => (this._listeners[ev] || []).forEach(cb => cb(data)));
    });

    this._socket.on('room:joined',  ({ playerIndex }) => { this.playerIndex = playerIndex; });
    this._socket.on('room:created', ({ roomCode })    => { this.roomCode = roomCode; this.playerIndex = 0; });
  }

  emit(ev, data)  { this._socket?.emit(ev, data); }
  on(ev, cb)      { if (!this._listeners[ev]) this._listeners[ev] = []; this._listeners[ev].push(cb); }
  off(ev, cb)     { if (this._listeners[ev]) this._listeners[ev] = this._listeners[ev].filter(f => f !== cb); }
  offAll(ev)      { delete this._listeners[ev]; }
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
