/**
 * Smart Manhole Guardian System - Main Server
 * Express REST API + Socket.IO WebSockets + Static Dashboard Hosting
 */

require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const DataStore = require('./store');
const TelegramService = require('./telegram');
const createApiRouter = require('./routes/api');
const ManholeSimulator = require('./simulator');

const PORT = parseInt(process.env.PORT || 3000, 10);
const OFFLINE_TIMEOUT_SECONDS = parseInt(process.env.OFFLINE_TIMEOUT_SECONDS || 30, 10);

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS enabled
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static dashboard files directly from /dashboard directory
const dashboardPath = path.join(__dirname, '..', 'dashboard');
app.use(express.static(dashboardPath));

// Initialize State Store & Telegram Bot Notification Service
const store = new DataStore({
  maxReadings: 100,
  offlineTimeoutSeconds: OFFLINE_TIMEOUT_SECONDS
});

const telegramService = new TelegramService();

// Connect DataStore events to Telegram & Socket.IO
store.on('status_change', (eventData) => {
  telegramService.handleStatusChange(eventData);
  io.emit('status_change', eventData);
});

store.on('device_offline', (data) => {
  console.log(`⚠️ [OFFLINE DETECTED] Device ${data.deviceId} (${data.name}) marked OFFLINE`);
  io.emit('device_offline', data);
  io.emit('device_list_update', store.getDevices());
});

// Mount REST API endpoints
app.use('/api', createApiRouter(store, telegramService, io));

// Socket.IO client connections
io.on('connection', (socket) => {
  // Immediately dispatch current system snapshot to newly connected client
  socket.emit('init_state', {
    devices: store.getDevices(),
    readings: store.getReadings(null, 50),
    alerts: store.getAlerts(),
    thresholds: store.thresholds
  });

  socket.on('request_refresh', () => {
    socket.emit('init_state', {
      devices: store.getDevices(),
      readings: store.getReadings(null, 50),
      alerts: store.getAlerts(),
      thresholds: store.thresholds
    });
  });

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// Catch-all route to serve the dashboard SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// Start listening (when running as standalone server, not in serverless Vercel)
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log('\n=============================================================');
    console.log('🛡️  SMART MANHOLE GUARDIAN SYSTEM - ONLINE');
    console.log('=============================================================');
    console.log(`🌐 Dashboard UI:        http://localhost:${PORT}`);
    console.log(`📡 Ingestion API:       http://localhost:${PORT}/api/data`);
    console.log(`📑 Devices List:        http://localhost:${PORT}/api/devices`);
    console.log(`🚨 Alert Log & Export:  http://localhost:${PORT}/api/alerts/export`);
    console.log('=============================================================');

    // Check if simulation mode is enabled via CLI argument or env var
    const args = process.argv.slice(2);
    const shouldSimulate = args.includes('--simulate') || process.env.SIMULATE === 'true';

    if (shouldSimulate) {
      console.log('🚀 Automatic Simulation Mode enabled (--simulate detected).');
      const simulator = new ManholeSimulator({ port: PORT, intervalMs: 2000 });
      simulator.start();
    } else {
      console.log('💡 Note: Run "npm run simulate" to demo with 5 simulated manholes.');
      console.log('   Or stream live serial data from real Arduino via /firmware/serial_bridge.');
    }
    console.log('=============================================================\n');
  });
}

app.server = server;
app.store = store;
app.io = io;

module.exports = app;

