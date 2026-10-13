import { Router } from 'express';
import {
  breakdownTask,
  getTaskPlans,
  getTaskPlanById,
  updateTaskItem,
  updateTaskPlan,
  deleteTaskPlan,
} from '../controllers/taskController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.use(optionalAuth);

router.post('/breakdown', breakdownTask);
router.get('/', getTaskPlans);
router.get('/:planId', getTaskPlanById);
router.patch('/:planId/items/:taskId', updateTaskItem);
router.patch('/:planId', updateTaskPlan);
router.delete('/:planId', deleteTaskPlan);

export default router;
