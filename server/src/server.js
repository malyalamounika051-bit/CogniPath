import app from './app.js';
import { config } from './config/env.js';
import { connectMongo } from './config/dbMongo.js';

// Connect to MongoDB Atlas in background
connectMongo().catch((err) => {
  console.warn('[Server] MongoDB startup warning:', err.message);
});

const server = app.listen(config.port, () => {
  console.log(`[CogniPath Server] Listening on http://localhost:${config.port}`);
  console.log(`[CogniPath Server] Mode: ${config.nodeEnv}`);
});

process.on('SIGTERM', () => {
  console.log('[CogniPath Server] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[CogniPath Server] HTTP server closed');
  });
});
