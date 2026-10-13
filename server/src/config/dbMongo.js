import mongoose from 'mongoose';
import { config } from '../config/env.js';

let isConnected = false;

export async function connectMongo() {
  if (!config.mongodbUri) {
    console.info('[MongoDB] MONGODB_URI not configured. Skipping MongoDB connection.');
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    console.info('[MongoDB] Connected successfully to MongoDB Atlas Cluster!');
    return true;
  } catch (err) {
    console.warn('[MongoDB] Connection warning:', err.message);
    return false;
  }
}

export function isMongoConnected() {
  return isConnected;
}
