import { Router } from 'express';
import { register, login, firebaseAuth, getMe, updatePreferences, setApiKey } from '../controllers/authController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/firebase-auth', firebaseAuth);
router.get('/me', optionalAuth, getMe);
router.patch('/preferences', optionalAuth, updatePreferences);
router.post('/api-key', optionalAuth, setApiKey);

export default router;
