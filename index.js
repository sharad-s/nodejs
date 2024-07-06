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

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  clients[socket.id] = socket.id;
  io.emit('clients', Object.keys(clients));
  io.emit('callClients', Object.keys(callClients));
  console.log(`Current clients: ${Object.keys(clients)}`);

  socket.on('joinCall', () => {
    console.log(`Client joined call: ${socket.id}`);
    callClients[socket.id] = socket.id;
    io.emit('callClients', Object.keys(callClients));
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

app.post('/reset', (req, res) => {
  console.log('Reset endpoint called');
  io.emit('forceDisconnect');
  clients = {};
  callClients = {};
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