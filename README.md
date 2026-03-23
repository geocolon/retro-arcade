# 🎮 Retro Arcade — Streets of Rage Browser Clone

Built with Phaser 3, Node.js, Socket.io. Single-player + live co-op.

## Quick Start
```bash
npm install && npm run install:all
cp server/.env.example server/.env
# Terminal 1: cd server && npm run dev
# Terminal 2: cd client && npm run dev
# Open: http://localhost:3000
```

## Controls
| Key | Action |
|-----|--------|
| Arrow Keys / WASD | Move |
| Z | Punch |
| X | Kick |
| Up / W | Jump |
| P | Pause |

## Co-op
1. Player 1 → HOST CO-OP ROOM (gets 4-letter code)
2. Player 2 → JOIN ROOM (enter code)
3. Real-time sync via Socket.io

## Phases
- [x] Phase 1 — Streets of Rage (single + co-op)
- [ ] Phase 2 — Real sprites + tilemaps
- [ ] Phase 3 — Score persistence (PostgreSQL)
- [ ] Phase 4 — Deploy to DigitalOcean
- [ ] Phase 5 — Double Dragon + Contra
