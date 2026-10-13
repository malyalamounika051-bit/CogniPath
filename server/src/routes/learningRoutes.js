import { Router } from 'express';
import {
  decodeJargon,
  createFocusCards,
  updateFocusCardsProgress,
  adaptMode,
  evaluateQuizAnswer,
  createPracticeChallenge,
  uploadDocument,
} from '../controllers/learningController.js';
import { optionalAuth } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

// Apply optionalAuth so guest or authenticated users work seamlessly
router.use(optionalAuth);

router.post('/decode', decodeJargon);
router.post('/focus-cards', createFocusCards);
router.patch('/focus-cards/:id/progress', updateFocusCardsProgress);
router.post('/mode', adaptMode);
router.post('/quiz/answer', evaluateQuizAnswer);
router.post('/practice-challenge', createPracticeChallenge);
router.post('/upload', uploadMiddleware.single('file'), uploadDocument);

export default router;
