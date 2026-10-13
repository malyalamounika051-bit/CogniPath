import { callAI } from '../services/aiService.js';
import { db } from '../models/db.js';
import { parseUploadedDocument } from '../services/documentService.js';
import { executeDecoderPipeline } from '../services/decoderPipelineService.js';

export async function decodeJargon(req, res, next) {
  try {
    const { text, level = 'beginner', topic } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Please provide the academic text or concept to explain.' },
      });
    }

    if (text.length > 20000) {
      return res.status(400).json({
        success: false,
        error: { code: 'INPUT_TOO_LONG', message: 'Input text exceeds the 20,000 character limit.' },
      });
    }

    // Run RAG-grounded Decoder pipeline
    const result = await executeDecoderPipeline(text.trim(), level, topic);

    // Save session in history
    const sessionTitle = result.conceptTitle || topic || text.slice(0, 50) + '...';
    const session = db.createSession({
      userId: req.user.id,
      featureType: 'decoder',
      inputTitle: sessionTitle,
      inputSummary: text.slice(0, 120),
      status: 'completed',
    });

    const savedRecord = db.saveExplanation({
      userId: req.user.id,
      sessionId: session.id,
      topic: sessionTitle,
      mode: 'decoder',
      conceptTitle: result.conceptTitle,
      simpleExplanation: result.simpleExplanation,
      analogy: result.analogy,
      keyTerms: result.keyTerms,
      takeaways: result.takeaways,
      example: result.example,
      selfCheck: result.selfCheck,
      sources: result.sources || [],
      searchStatus: result.searchStatus,
      verificationNotes: result.verificationNotes,
    });

    res.status(200).json({
      success: true,
      data: {
        id: savedRecord.id,
        sessionId: session.id,
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createFocusCards(req, res, next) {
  try {
    const { text, cardCount = 4, level = 'beginner', title } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Please provide study material to generate focus cards.' },
      });
    }

    const safeCount = Math.max(2, Math.min(Number(cardCount) || 4, 8));

    const prompt = `TASK: Divide the supplied study material into ${safeCount} bite-sized focus cards.
INPUT TEXT:
${text.trim()}

DIFFICULTY LEVEL:
${level}

REQUIREMENTS:
- Return ONLY valid raw JSON.
- Output schema:
  - "title": string
  - "estimatedReadingMinutes": number
  - "cards": array of objects with:
    - "id": string (e.g. "card_1")
    - "sectionNumber": number
    - "title": string
    - "mainIdea": string
    - "explanation": string
    - "keyPoints": array of strings
    - "vocabulary": array of { "term": string, "definition": string }
    - "selfCheck": string`;

    const result = await callAI('focusCards', prompt, { text, cardCount: safeCount, level, topic: title });

    const session = db.createSession({
      userId: req.user.id,
      featureType: 'focus_cards',
      inputTitle: result.title || title || 'Focus Study Session',
      inputSummary: text.slice(0, 120),
      status: 'completed',
    });

    const savedCards = db.saveFocusCards({
      userId: req.user.id,
      sessionId: session.id,
      title: result.title || title || 'Focus Cards',
      cards: result.cards,
      completedCardIds: [],
    });

    res.status(200).json({
      success: true,
      data: {
        id: savedCards.id,
        sessionId: session.id,
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateFocusCardsProgress(req, res, next) {
  try {
    const { id } = req.params;
    const { completedCardIds } = req.body;

    if (!Array.isArray(completedCardIds)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'completedCardIds must be an array of IDs.' },
      });
    }

    const updated = db.updateFocusCardsProgress(id, completedCardIds, req.user.id);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Focus card collection not found or unauthorized.' },
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

export async function adaptMode(req, res, next) {
  try {
    const { topic, mode = 'story', level = 'beginner' } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Please provide a topic or concept to adapt.' },
      });
    }

    if (!['story', 'step_by_step', 'quiz'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_MODE', message: 'Supported modes are: story, step_by_step, quiz.' },
      });
    }

    const prompt = `TASK: Explain the topic in the selected mode.
TOPIC: ${topic}
MODE: ${mode}
LEVEL: ${level}

IF MODE IS story:
Return JSON with:
- "mode": "story"
- "storyTitle": string
- "storyText": string
- "conceptConnection": string
- "moralOrInsight": string

IF MODE IS step_by_step:
Return JSON with:
- "mode": "step_by_step"
- "whatItMeans": string
- "whyItMatters": string
- "howItWorks": array of strings
- "workedExample": string
- "commonMistake": string
- "summary": string

IF MODE IS quiz:
Return JSON with:
- "mode": "quiz"
- "questions": array of 3 objects with:
  - "id": string
  - "question": string
  - "options": array of 4 strings
  - "correctAnswerIndex": number (0 to 3)
  - "explanation": string
  - "difficulty": "easy" | "medium" | "hard"`;

    const result = await callAI('mode', prompt, { topic, mode, level });

    const session = db.createSession({
      userId: req.user.id,
      featureType: `mode_${mode}`,
      inputTitle: topic,
      inputSummary: `Adaptive Mode: ${mode}`,
      status: 'completed',
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        topic,
        mode,
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function evaluateQuizAnswer(req, res, next) {
  try {
    const { questionId, selectedIndex, correctAnswerIndex } = req.body;

    if (selectedIndex === undefined || correctAnswerIndex === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Selected answer and correct answer indices are required.' },
      });
    }

    const isCorrect = Number(selectedIndex) === Number(correctAnswerIndex);

    res.status(200).json({
      success: true,
      data: {
        questionId,
        selectedIndex,
        isCorrect,
        correctIndex: correctAnswerIndex,
        feedback: isCorrect
          ? 'Excellent! You picked the accurate answer.'
          : 'Good try! Review the explanation to clarify the underlying concept.',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createPracticeChallenge(req, res, next) {
  try {
    const { topic, subject = 'Computer Science', level = 'beginner' } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Please provide a concept or topic for the challenge.' },
      });
    }

    const prompt = `TASK: Create a practical challenge bridging theory to practice.
TOPIC: ${topic}
SUBJECT: ${subject}
LEVEL: ${level}

REQUIREMENTS:
- Return ONLY valid raw JSON with:
  - "conceptSummary": string
  - "scenario": string
  - "challenge": string
  - "requirements": array of strings
  - "hints": array of 3 progressive hints
  - "expectedOutcome": string
  - "reflectionQuestions": array of strings
  - "optionalSolution": string`;

    const result = await callAI('practiceChallenge', prompt, { topic, subject, level });

    const session = db.createSession({
      userId: req.user.id,
      featureType: 'practice_challenge',
      inputTitle: topic,
      inputSummary: `Theory to practice in ${subject}`,
      status: 'completed',
    });

    const savedChallenge = db.saveChallenge({
      userId: req.user.id,
      sessionId: session.id,
      topic,
      level,
      ...result,
    });

    res.status(200).json({
      success: true,
      data: {
        id: savedChallenge.id,
        sessionId: session.id,
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded. Please select a document.' },
      });
    }

    const extractedText = await parseUploadedDocument(req.file.path, req.file.originalname);

    res.status(200).json({
      success: true,
      data: {
        filename: req.file.originalname,
        text: extractedText,
        characterCount: extractedText.length,
      },
    });
  } catch (err) {
    next(err);
  }
}
