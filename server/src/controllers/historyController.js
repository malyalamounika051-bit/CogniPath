import { db } from '../models/db.js';

export async function getHistory(req, res, next) {
  try {
    const sessions = db.getHistory(req.user.id);
    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
}

export async function getExplanation(req, res, next) {
  try {
    const { id } = req.params;
    const explanation = db.getExplanationById(id, req.user.id);

    if (!explanation) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Saved explanation not found.' },
      });
    }

    res.status(200).json({
      success: true,
      data: explanation,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteHistoryItem(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = db.deleteSession(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'History session not found or already deleted.' },
      });
    }

    res.status(200).json({
      success: true,
      data: { message: 'History item removed successfully.' },
    });
  } catch (err) {
    next(err);
  }
}
