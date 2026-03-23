require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL||'http://localhost:3000', methods:['GET','POST'] },
  transports: ['websocket','polling'],
});

app.use(cors()); app.use(express.json());

if (process.env.NODE_ENV==='production') {
  app.use(express.static(path.join(__dirname,'../client/dist')));
  app.get('*',(_,res)=>res.sendFile(path.join(__dirname,'../client/dist/index.html')));
}

app.get('/api/health',(_,res)=>res.json({status:'ok',uptime:process.uptime()}));
app.get('/api/scores',(_,res)=>res.json({scores:[]}));

const rooms = new Map();
function genCode() {
  const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code=''; for (let i=0;i<4;i++) code+=c[Math.floor(Math.random()*c.length)];
  return rooms.has(code)?genCode():code;
}

io.on('connection', socket => {
  console.log(`[+] ${socket.id}`);

  socket.on('room:create', () => {
    const code=genCode(); rooms.set(code,{players:[socket.id],state:'waiting'});
    socket.join(code); socket.roomCode=code; socket.playerIndex=0;
    socket.emit('room:created',{roomCode:code});
    console.log(`[Room] ${code} created`);
  });

  socket.on('room:join',({roomCode}) => {
    const room=rooms.get(roomCode);
    if (!room)            { socket.emit('room:error',{message:'Room not found.'}); return; }
    if (room.players.length>=2) { socket.emit('room:error',{message:'Room is full.'}); return; }
    room.players.push(socket.id); room.state='ready';
    socket.join(roomCode); socket.roomCode=roomCode; socket.playerIndex=1;
    socket.emit('room:joined',{roomCode,playerIndex:1});
    io.to(roomCode).emit('game:start',{mode:'coop',roomCode});
    console.log(`[Room] ${roomCode} starting`);
  });

  socket.on('player:update',({roomCode,state}) => socket.to(roomCode).emit('player:update',{state}));

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    const code=socket.roomCode; if (!code) return;
    const room=rooms.get(code); if (!room) return;
    room.players=room.players.filter(id=>id!==socket.id);
    if (room.players.length===0) rooms.delete(code);
    else io.to(code).emit('game:over',{reason:'partner_left'});
  });
});

const PORT=process.env.PORT||4000;
server.listen(PORT,()=>console.log(`\n🎮 Server running on http://localhost:${PORT}\n`));
