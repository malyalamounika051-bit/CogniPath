import app from '../server/src/app.js';
import { connectMongo } from '../server/src/config/dbMongo.js';

// Ensure MongoDB Atlas is connected on serverless function invocation
connectMongo().catch((err) => {
  console.warn('[Vercel Serverless] MongoDB connect warning:', err.message);
});

export default app;
