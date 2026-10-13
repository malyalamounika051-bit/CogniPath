import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { db } from '../models/db.js';

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = db.findUserById(decoded.id);
      if (user) {
        req.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          preferences: user.preferences,
          isGuest: false,
        };
        return next();
      }
    } catch (err) {
      // Invalid/expired token: fallback to guest with info
    }
  }

  // Fallback to guest learner
  req.user = {
    id: 'guest',
    name: 'Guest Learner',
    email: 'guest@cognipath.local',
    preferences: {
      fontSize: 'normal',
      dyslexicFont: false,
      readingFocusMode: false,
    },
    isGuest: true,
  };
  next();
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required to access this resource.',
      },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.',
        },
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      preferences: user.preferences,
      isGuest: false,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token. Please sign in again.',
      },
    });
  }
}
