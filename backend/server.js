require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supplypulse';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Ensure all models are registered (creates collections if needed)
    require('./models/Organization');
    require('./models/User');
    require('./models/DataSources');
    require('./models/StockLevel');
    require('./models/SystemSetting');
    require('./models/PendingTrigger');
    require('./models/index');

    console.log('[Server] Ready — no demo data seeded. Register an org to get started.');

    // Start live stock simulator (ticks all org stock, no-op when empty)
    const { startSimulator } = require('./services/stockSimulator');
    startSimulator(io);

    // Start BullMQ worker only if Redis is reachable
    (async () => {
      try {
        const net = require('net');
        await new Promise((resolve, reject) => {
          const sock = net.createConnection(
            { host: process.env.UPSTASH_REDIS_HOST, port: parseInt(process.env.UPSTASH_REDIS_PORT) || 6379, timeout: 3000 },
            resolve
          );
          sock.on('error', reject);
          sock.on('timeout', () => reject(new Error('timeout')));
        });
        const { startWorker } = require('./queue/agentWorker');
        startWorker(io);
      } catch {
        console.warn('[Worker] Redis unreachable — BullMQ worker disabled. Pipeline runs directly.');
      }
    })();
  })
  .catch(err => console.error('MongoDB connection error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

// Socket.io connection with room scoping
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Extract token from query or auth headers
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.organizationId) {
        const orgIdStr = decoded.organizationId.toString();
        socket.join(orgIdStr);
        console.log(`[Socket] Client ${socket.id} authorized & joined room for org: ${orgIdStr}`);
      }
    } catch (err) {
      console.warn(`[Socket] Token verification failed for ${socket.id}:`, err.message);
    }
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Pass io to request object so routes can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Basic route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SupplyPulse API is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/crisis', require('./routes/crisis'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/execution', require('./routes/execution'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/settings', require('./routes/settings'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
