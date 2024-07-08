const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

let clients = {};
let callClients = {};
let waitingQueue = [];

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  clients[socket.id] = socket.id;
  io.emit('clients', Object.keys(clients));
  io.emit('callClients', Object.keys(callClients));
  console.log(`Current clients: ${Object.keys(clients)}`);

  socket.on('joinQueue', () => {
    console.log(`Client joined queue: ${socket.id}`);
    waitingQueue.push(socket.id);
    pairClients();
  });

  socket.on('leaveQueue', () => {
    console.log(`Client left queue: ${socket.id}`);
    waitingQueue = waitingQueue.filter(id => id !== socket.id);
  });

  socket.on('leaveCall', () => {
    console.log(`Client left call: ${socket.id}`);
    delete callClients[socket.id];
    io.emit('callClients', Object.keys(callClients));
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    delete clients[socket.id];
    delete callClients[socket.id];
    waitingQueue = waitingQueue.filter(id => id !== socket.id);
    io.emit('clients', Object.keys(clients));
    io.emit('callClients', Object.keys(callClients));
    console.log(`Current clients: ${Object.keys(clients)}`);
  });

  socket.on('signal', (data) => {
    console.log(`Signal received from ${socket.id} to ${data.to}`);
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  });

  socket.on('reset', () => {
    console.log('Resetting all connections');
    io.emit('forceDisconnect');
  });
});

function pairClients() {
  while (waitingQueue.length >= 2) {
    const client1 = waitingQueue.shift();
    const client2 = waitingQueue.shift();
    callClients[client1] = client1;
    callClients[client2] = client2;
    io.to(client1).emit('paired', { with: client2 });
    io.to(client2).emit('paired', { with: client1 });
    io.emit('callClients', Object.keys(callClients));
  }
}

app.post('/reset', (req, res) => {
  console.log('Reset endpoint called');
  io.emit('forceDisconnect');
  clients = {};
  callClients = {};
  waitingQueue = [];
  io.emit('clients', Object.keys(clients));
  io.emit('callClients', Object.keys(callClients));
  res.send('All connections have been reset');
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

server.listen(3000, () => {
  console.log('Signaling server running on port 3000');
});