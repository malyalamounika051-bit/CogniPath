import { callAI } from '../services/aiService.js';
import { db } from '../models/db.js';

export async function breakdownTask(req, res, next) {
  try {
    const { title, deadline, dailyAvailableMinutes = 60, level = 'beginner' } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Please provide the assignment, project, or exam goal to break down.' },
      });
    }

    const prompt = `TASK: Convert the user's overwhelming study or project goal into actionable, bite-sized tasks.
GOAL: ${title}
DEADLINE: ${deadline || 'Flexible'}
DAILY STUDY TIME: ${dailyAvailableMinutes} minutes
STUDENT LEVEL: ${level}

REQUIREMENTS:
- Return ONLY valid raw JSON.
- Output schema:
  - "taskPlanTitle": string
  - "totalEstimatedMinutes": number
  - "recommendedPriority": "high" | "medium" | "low"
  - "feasibility": string (analysis if target fits available schedule)
  - "schedulingNotes": string
  - "tasks": array of objects with:
    - "id": string (e.g. "t_1")
    - "title": string
    - "description": string
    - "estimatedMinutes": number
    - "priority": "high" | "medium" | "low"
    - "status": "pending" | "completed"
    - "dependencies": array of string ids`;

    const result = await callAI('taskBreakdown', prompt, {
      topic: title,
      deadline,
      dailyAvailableMinutes,
      level,
    });

    const session = db.createSession({
      userId: req.user.id,
      featureType: 'task_breakdown',
      inputTitle: title,
      inputSummary: `${result.tasks?.length || 5} tasks estimated at ${result.totalEstimatedMinutes} mins`,
      status: 'completed',
    });

    const taskPlan = db.createTaskPlan({
      userId: req.user.id,
      sessionId: session.id,
      title: result.taskPlanTitle || title,
      description: `Target goal: ${title}`,
      deadline: deadline || null,
      dailyAvailableMinutes: Number(dailyAvailableMinutes),
      totalEstimatedMinutes: result.totalEstimatedMinutes,
      recommendedPriority: result.recommendedPriority,
      feasibility: result.feasibility,
      schedulingNotes: result.schedulingNotes,
      topicOverview: result.topicOverview || null,
      tasks: result.tasks || [],
    });

    res.status(201).json({
      success: true,
      data: taskPlan,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTaskPlans(req, res, next) {
  try {
    const plans = db.getTaskPlans(req.user.id);
    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTaskPlanById(req, res, next) {
  try {
    const { planId } = req.params;
    const plan = db.getTaskPlanById(planId, req.user.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task plan not found or access denied.' },
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskItem(req, res, next) {
  try {
    const { planId, taskId } = req.params;
    const updates = req.body;

    const allowedFields = ['status', 'title', 'description', 'estimatedMinutes', 'priority'];
    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    const updatedPlan = db.updateTaskPlanItem(planId, taskId, filteredUpdates, req.user.id);

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task item or plan not found.' },
      });
    }

    res.status(200).json({
      success: true,
      data: updatedPlan,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskPlan(req, res, next) {
  try {
    const { planId } = req.params;
    const { tasks, title, deadline, dailyAvailableMinutes } = req.body;

    const updates = {};
    if (tasks !== undefined && Array.isArray(tasks)) updates.tasks = tasks;
    if (title !== undefined) updates.title = title;
    if (deadline !== undefined) updates.deadline = deadline;
    if (dailyAvailableMinutes !== undefined) updates.dailyAvailableMinutes = Number(dailyAvailableMinutes);

    const updated = db.updateTaskPlan(planId, updates, req.user.id);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task plan not found.' },
      });
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTaskPlan(req, res, next) {
  try {
    const { planId } = req.params;
    const deleted = db.deleteTaskPlan(planId, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task plan not found or already removed.' },
      });
    }

    res.status(200).json({
      success: true,
      data: { message: 'Task plan successfully deleted.' },
    });
  } catch (err) {
    next(err);
  }
}
