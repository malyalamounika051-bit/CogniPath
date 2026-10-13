import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../models/db.js';
import { config } from '../config/env.js';
import { updateApiKey } from '../services/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../../../server/.env');

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required.' },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters long.' },
      });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'An account with this email address already exists.' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      preferences: {
        fontSize: 'normal',
        dyslexicFont: false,
        readingFocusMode: false,
      },
    });

    const token = jwt.sign({ id: newUser.id }, config.jwtSecret, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          preferences: newUser.preferences,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' },
      });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
    }

    const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          preferences: user.preferences,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function firebaseAuth(req, res, next) {
  try {
    const { email, name, uid, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email is required from Firebase authentication.' },
      });
    }

    let user = db.findUserByEmail(email);

    if (!user) {
      user = db.createUser({
        name: name || email.split('@')[0],
        email: email.trim().toLowerCase(),
        firebaseUid: uid,
        photoURL: photoURL || null,
        preferences: {
          fontSize: 'normal',
          dyslexicFont: false,
          readingFocusMode: false,
        },
      });
    }

    const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          preferences: user.preferences,
          photoURL: user.photoURL || photoURL || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
        aiConfigured: Boolean(config.geminiApiKey),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const { preferences } = req.body;
    if (req.user.isGuest) {
      return res.status(200).json({
        success: true,
        data: { preferences },
      });
    }

    const user = db.findUserById(req.user.id);
    if (user) {
      user.preferences = { ...user.preferences, ...preferences };
      db.save();
    }

    res.status(200).json({
      success: true,
      data: {
        preferences: user ? user.preferences : preferences,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function setApiKey(req, res, next) {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_KEY', message: 'Please provide a valid Gemini API key.' },
      });
    }

    const trimmedKey = apiKey.trim();
    updateApiKey(trimmedKey);

    // Persist to server/.env safely
    try {
      if (fs.existsSync(ENV_PATH)) {
        let content = fs.readFileSync(ENV_PATH, 'utf-8');
        if (content.includes('GEMINI_API_KEY=')) {
          content = content.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${trimmedKey}`);
        } else {
          content += `\nGEMINI_API_KEY=${trimmedKey}\n`;
        }
        fs.writeFileSync(ENV_PATH, content, 'utf-8');
      }
    } catch (fsErr) {
      console.warn('Could not persist key to .env file:', fsErr.message);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Google Gemini API key successfully updated.',
        aiConfigured: true,
      },
    });
  } catch (err) {
    next(err);
  }
}
