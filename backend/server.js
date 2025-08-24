require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
// const path = require('path');
const connectDB = require('./models/db');
const errorMiddleware = require('./middlewares/error-middleware');

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = "https://realtime-neighbourhood-incident-tracker-6hfe.onrender.com";
// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', FRONTEND_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Socket.IO configuration
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', FRONTEND_URL],
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Make io accessible to other modules
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join incident-specific room for comments
  socket.on('join-incident', (incidentId) => {
    socket.join(`incident-${incidentId}`);
    console.log(`Socket ${socket.id} joined incident room: incident-${incidentId}`);
  });

  // Leave incident-specific room
  socket.on('leave-incident', (incidentId) => {
    socket.leave(`incident-${incidentId}`);
    console.log(`Socket ${socket.id} left incident room: incident-${incidentId}`);
  });

  // Join general incidents room for real-time incident updates
  socket.on('join-incidents', () => {
    socket.join('incidents');
    console.log(`Socket ${socket.id} joined incidents room`);
  });

  // Leave general incidents room
  socket.on('leave-incidents', () => {
    socket.leave('incidents');
    console.log(`Socket ${socket.id} left incidents room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.use(express.json());
app.use('/api/auth', require('./routes/auth-route'));
app.use('/api/incidents', require('./routes/incident-route'));
app.use('/api/incidents', require('./routes/incident-comment-route'));
app.use('/api/incidents', require('./routes/vote-route'));
app.use('/api/incidents', require('./routes/false-report-route'));
app.use('/api/comment', require('./routes/comment-route'));

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('<h1><b>Hello, World!</b></h1>');
});

app.use(errorMiddleware);
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to the database:', err);
  process.exit(0);
});