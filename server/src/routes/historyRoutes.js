import { Router } from 'express';
import { getHistory, getExplanation, deleteHistoryItem } from '../controllers/historyController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.use(optionalAuth);

router.get('/', getHistory);
router.get('/explanation/:id', getExplanation);
router.delete('/:id', deleteHistoryItem);

export default router;
