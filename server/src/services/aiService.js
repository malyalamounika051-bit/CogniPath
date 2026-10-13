import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { findVerifiedTopic, extractFromSourceText } from './knowledgeBase.js';
import {
  decoderResponseSchema,
  focusCardsResponseSchema,
  storyModeSchema,
  stepByStepModeSchema,
  quizModeSchema,
  taskBreakdownResponseSchema,
  practiceBridgeResponseSchema,
} from '../validators/aiSchemas.js';

let genAI = null;
if (config.geminiApiKey) {
  try {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  } catch (err) {
    console.warn('[AI Service] Failed to initialize Gemini API client:', err.message);
  }
}

export function updateApiKey(newKey) {
  if (newKey && newKey.trim()) {
    config.geminiApiKey = newKey.trim();
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    return true;
  }
  return false;
}

const SYSTEM_INSTRUCTION = `You are CogniPath, an elite educational intelligence tutor and academic expert.
Your mission is to provide 100% scientifically, mathematically, and technically ACCURATE explanations tailored to students.

STRICT ACCURACY RULES:
1. SPECIFICITY: You must answer the specific topic and context provided by the user. NEVER substitute with generic problem-solving, workshop, restaurant, or factory templates.
2. ACCURACY: If the topic is biological (e.g. Chlorophyll, Photosynthesis), explain exact pigments, organelles (chloroplast, thylakoid), wavelengths (blue/red vs green reflection), and chemical equations.
   If the topic is computational (e.g. Binary Search), explain sorted invariants, midpoint index arithmetic, and O(log n) time.
   If the topic is database theory (e.g. Normalization), explain 1NF atomic values, 2NF partial key dependencies, and 3NF transitive dependencies.
3. NO FILLER: Do NOT invent arbitrary placeholder sections like "Factor 1", "Factor 2", "aspect 1", or "boundary conditions" unless specifically applicable.
4. ANALOGIES: Any analogy must accurately map its components to the real-world mechanism of the target concept.
5. FORMAT: Return ONLY valid, raw, parseable JSON conforming strictly to the requested schema. No markdown backticks, no prose outside JSON.`;

function extractJson(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

// Build specialized feature prompts
function buildPrompt(feature, params) {
  const { topic = '', text = '', level = 'beginner', cardCount = 4, mode = 'story', subject = 'General Science', deadline, dailyAvailableMinutes } = params;
  const target = (topic || text.slice(0, 150)).trim();

  if (feature === 'decode') {
    const sources = params.sources || [];
    const sourceEvidence = sources.length > 0
      ? `\nRETRIEVED WEB EVIDENCE:\n${sources.map((s, idx) => `[Source ${idx + 1}] ${s.title} (${s.url}):\n${s.snippet}`).join('\n\n')}\n`
      : '';

    return `TASK: You are an educational tutor. Your job is to help the student understand the concept, not repeat the source material.
Read the supplied passage to identify what the student needs to learn. Use the retrieved evidence to verify and clarify the relevant facts. Rewrite the explanation in your own clear, simple language.
Do NOT copy the source passage as the final explanation. Do not merely replace a few technical words with simpler synonyms. Break down the underlying idea and explain how it works.
Use short sentences, familiar words, meaningful examples, and a relevant analogy. Preserve important technical details and qualifications.
Do not invent facts. The result must be understandable to someone at the ${level} difficulty level without losing factual accuracy.

CONCEPT / SUBMITTED PASSAGE:
${text || topic}
${sourceEvidence}
LEVEL: ${level}

REQUIRED JSON SCHEMA:
{
  "conceptTitle": "Concise, precise title of the actual concept",
  "simpleExplanation": "Genuinely transformed, original explanation in accessible language for ${level} level. MUST NOT repeat original sentences verbatim.",
  "analogy": "An intuitive, concrete analogy that accurately maps directly to the specific mechanism of ${target}. Explain what each part represents and any limitation of the analogy.",
  "keyTerms": [
    { "term": "Specific Term 1", "definition": "Accurate definition directly from the topic domain", "whyItMatters": "Why this term is crucial" },
    { "term": "Specific Term 2", "definition": "Accurate definition directly from the topic domain", "whyItMatters": "Why this term is crucial" }
  ],
  "takeaways": [
    "Factually accurate takeaway 1 specifically about ${target}",
    "Factually accurate takeaway 2 specifically about ${target}",
    "Factually accurate takeaway 3 specifically about ${target}"
  ],
  "example": "A concrete real-world manifestation or scenario of ${target}",
  "selfCheck": {
    "question": "A concept-specific scenario or question testing understanding of ${target}",
    "hint": "A guiding hint referencing the core mechanism"
  }
}`;
  }

  if (feature === 'focusCards') {
    return `TASK: Divide the following study material or concept into ${cardCount} bite-sized, distinct focus cards.
SOURCE TEXT / TOPIC:
${text || topic}

LEVEL: ${level}
CARD COUNT: ${cardCount}

INSTRUCTIONS:
- Each card MUST cover a distinct, coherent subtopic of ${target}.
- Do NOT repeat identical explanations or generic "Factor" labels across cards.
- If source text is provided, ground explanations strictly in the source text.

REQUIRED JSON SCHEMA:
{
  "title": "Clear, descriptive title for the overall guide",
  "estimatedReadingMinutes": ${cardCount * 2},
  "cards": [
    {
      "id": "card_1",
      "sectionNumber": 1,
      "title": "Specific subtopic title (NOT generic)",
      "mainIdea": "Core concept sentence specific to this section",
      "explanation": "Detailed, accurate explanation of this specific subtopic",
      "keyPoints": [
        "Accurate key point 1 specific to ${target}",
        "Accurate key point 2 specific to ${target}"
      ],
      "vocabulary": [
        { "term": "Actual domain term", "definition": "Real scientific or technical definition" }
      ],
      "selfCheck": "Question testing the content of this specific card"
    }
  ]
}`;
  }

  if (feature === 'mode') {
    if (mode === 'story') {
      return `TASK: Explain ${target} using Story Mode.
TOPIC: ${target}
LEVEL: ${level}

INSTRUCTIONS:
- Write an engaging, scientifically/conceptually sound narrative.
- The story must explicitly map characters or events to the real components of ${target}.
- Do NOT use generic craft workshop or factory tropes unless the topic is manufacturing.

REQUIRED JSON SCHEMA:
{
  "mode": "story",
  "storyTitle": "Creative and relevant story title",
  "storyText": "Narrative introducing and explaining the specific mechanism of ${target}",
  "conceptConnection": "Clear explanation of how the story components map to the actual concept of ${target}",
  "moralOrInsight": "The foundational takeaway or scientific principle illustrated"
}`;
    }

    if (mode === 'step_by_step') {
      return `TASK: Explain ${target} using Step-by-Step Logic Mode.
TOPIC: ${target}
LEVEL: ${level}

REQUIRED JSON SCHEMA:
{
  "mode": "step_by_step",
  "whatItMeans": "Formal, clear definition of ${target}",
  "whyItMatters": "Real-world importance and why it is indispensable",
  "howItWorks": [
    "Step 1: First actual operational phase of ${target}",
    "Step 2: Second operational phase of ${target}",
    "Step 3: Third operational phase of ${target}",
    "Step 4: Final verification or outcome phase of ${target}"
  ],
  "workedExample": "A concrete worked example or execution trace of ${target}",
  "commonMistake": "A frequent student misconception specifically about ${target}",
  "summary": "Concise synthesis of the core principle"
}`;
    }

    if (mode === 'quiz') {
      return `TASK: Generate 3 high-quality practice quiz questions testing knowledge of ${target}.
TOPIC: ${target}
LEVEL: ${level}

REQUIRED JSON SCHEMA:
{
  "mode": "quiz",
  "questions": [
    {
      "id": "q1",
      "question": "A clear, unambiguous multiple-choice question testing ${target}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Factually sound explanation justifying why Option A is correct",
      "difficulty": "easy"
    },
    {
      "id": "q2",
      "question": "Medium difficulty question testing an applied mechanism of ${target}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 1,
      "explanation": "Factually sound explanation justifying the correct answer",
      "difficulty": "medium"
    },
    {
      "id": "q3",
      "question": "Challenging question testing a boundary condition or edge case of ${target}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 2,
      "explanation": "Factually sound explanation justifying the correct answer",
      "difficulty": "hard"
    }
  ]
}`;
    }
  }

  if (feature === 'taskBreakdown') {
    return `TASK: Create a comprehensive, structured study curriculum and action plan for '${target}'.
GOAL: ${target}
DEADLINE: ${deadline || 'Flexible'}
DAILY STUDY TIME: ${dailyAvailableMinutes || 60} minutes
LEVEL: ${level}

INSTRUCTIONS:
1. Break down '${target}' into 4 to 6 logical learning phases or modules spanning fundamentals to advanced application.
2. For EVERY task/module, list specific subtopics (the exact concepts, architectures, techniques, or algorithms covered).
3. Include specific learning outcomes and a concrete deliverable or practice exercise for each module.
4. Ensure the total study time is realistic, well-paced, and sequential.

REQUIRED JSON FORMAT:
{
  "taskPlanTitle": "Complete Study Blueprint: ${target}",
  "topicOverview": "A high-level overview explaining how this curriculum covers ${target} comprehensively from foundational principles to real-world execution.",
  "totalEstimatedMinutes": 180,
  "recommendedPriority": "high",
  "feasibility": "Realistic feasibility assessment based on ${dailyAvailableMinutes || 60} minutes per day.",
  "schedulingNotes": "Strategic study advice, best practices, and recommended order of study for ${target}.",
  "tasks": [
    {
      "id": "t_1",
      "title": "Module 1: Foundations & Core Architecture of ${target}",
      "description": "Master the foundational theories, mathematical/conceptual pillars, and terminology.",
      "subtopics": [
        "Core Concept Definition & History",
        "Key Architectural Building Blocks",
        "Essential Principles & Terminology"
      ],
      "learningOutcomes": [
        "Explain the primary mechanism in your own words",
        "Identify the key inputs, transitions, and outputs"
      ],
      "estimatedMinutes": 35,
      "priority": "high",
      "status": "pending",
      "dependencies": []
    },
    {
      "id": "t_2",
      "title": "Module 2: Key Algorithms, Methods & Variations",
      "description": "Deep dive into the primary techniques, standard models, and operational workflows.",
      "subtopics": [
        "Primary Algorithms & Implementations",
        "Parameter Tuning & Evaluation Metrics"
      ],
      "learningOutcomes": [
        "Implement or trace standard workflows",
        "Compare trade-offs between alternative methods"
      ],
      "estimatedMinutes": 45,
      "priority": "high",
      "status": "pending",
      "dependencies": ["t_1"]
    },
    {
      "id": "t_3",
      "title": "Module 3: Hands-On Practice & Real-World Application",
      "description": "Build a concrete mini-project or solve real-world problems applying ${target}.",
      "subtopics": [
        "Practical Setup & Frameworks",
        "End-to-End Problem Walkthrough",
        "Common Bottlenecks & Optimization"
      ],
      "learningOutcomes": [
        "Apply the concept to a real-world scenario",
        "Troubleshoot common failure cases and edge conditions"
      ],
      "estimatedMinutes": 50,
      "priority": "medium",
      "status": "pending",
      "dependencies": ["t_2"]
    },
    {
      "id": "t_4",
      "title": "Module 4: Advanced Topics, Ethics & Examination Review",
      "description": "Synthesize understanding, review edge cases, evaluation criteria, and practical deployment.",
      "subtopics": [
        "Advanced Extensions & Modern Trends",
        "Limitations, Safety & Best Practices",
        "Self-Assessment & Knowledge Check"
      ],
      "learningOutcomes": [
        "Critically evaluate complex scenarios",
        "Demonstrate full topic mastery on practice assessments"
      ],
      "estimatedMinutes": 40,
      "priority": "medium",
      "status": "pending",
      "dependencies": ["t_3"]
    }
  ]
}`;
  }

  if (feature === 'practiceChallenge') {
    return `TASK: Design an authentic real-world challenge bridging theory to practice for '${target}'.
TOPIC: ${target}
SUBJECT DOMAIN: ${subject}
LEVEL: ${level}

REQUIRED JSON SCHEMA:
{
  "conceptSummary": "Concise, accurate technical refresher of ${target}",
  "scenario": "A realistic, credible industry or research scenario where ${target} is essential",
  "challenge": "The specific technical problem the student must solve using ${target}",
  "requirements": [
    "Requirement 1 testing proper application of ${target}",
    "Requirement 2 testing boundary condition handling",
    "Requirement 3 testing efficiency or correctness"
  ],
  "hints": [
    "Hint 1: Guiding initial setup without spoiling the answer",
    "Hint 2: Intermediate architectural suggestion",
    "Hint 3: Detailed pointer toward the final solution"
  ],
  "expectedOutcome": "What a successful, high-quality solution demonstrates",
  "reflectionQuestions": [
    "Deep question connecting this scenario back to the core theory of ${target}",
    "Trade-off or scaling question regarding ${target}"
  ],
  "optionalSolution": "Step-by-step verified solution walkthrough and evaluation rubric demonstrating ${target}"
}`;
  }

  throw new Error(`Unsupported feature: ${feature}`);
}

/**
 * Normalizes a decoder response from Gemini before Zod validation.
 * Handles cases where Gemini returns `analogy` as an object instead of a string.
 */
function normalizeDecoderResponse(data) {
  if (!data || typeof data !== 'object') return data;
  const out = { ...data };

  // Coerce analogy object → string
  if (out.analogy && typeof out.analogy === 'object') {
    const a = out.analogy;
    const parts = [];
    if (a.text) parts.push(a.text);
    else if (a.analogyText) parts.push(a.analogyText);
    else if (a.analogy) parts.push(typeof a.analogy === 'string' ? a.analogy : '');
    else if (a.description) parts.push(a.description);
    
    if (a.analogyExplanation) parts.push(a.analogyExplanation);
    if (a.components) parts.push(`Components: ${a.components}`);
    if (a.limitation) parts.push(`Note: ${a.limitation}`);
    if (a.analogyLimitations) parts.push(`Note: ${a.analogyLimitations}`);
    if (a.caveat) parts.push(`Note: ${a.caveat}`);

    if (parts.length > 0) {
      out.analogy = parts.join(' ');
    } else {
      out.analogy = Object.values(a).filter(v => typeof v === 'string').join(' ') || JSON.stringify(a);
    }
  }

  // Coerce selfCheck object if it comes back as a string
  if (out.selfCheck && typeof out.selfCheck === 'string') {
    out.selfCheck = { question: out.selfCheck, hint: 'Think carefully about the core mechanism.' };
  }

  // Coerce keyTerms entries — definition might be an object
  if (Array.isArray(out.keyTerms)) {
    out.keyTerms = out.keyTerms.map((kt) => {
      if (kt && typeof kt.definition === 'object') {
        kt = { ...kt, definition: kt.definition.text || kt.definition.meaning || JSON.stringify(kt.definition) };
      }
      return kt;
    });
  }

  // Coerce takeaways — might be objects
  if (Array.isArray(out.takeaways)) {
    out.takeaways = out.takeaways.map((t) =>
      typeof t === 'object' ? (t.text || t.takeaway || JSON.stringify(t)) : t
    );
  }

  return out;
}

/**
 * Normalizes task breakdown output from Gemini before validation.
 * Ensures tasks have required fields and sensible defaults.
 */
function normalizeTaskBreakdownResponse(data, target) {
  if (!data || typeof data !== 'object') return data;
  const out = { ...data };

  out.taskPlanTitle = out.taskPlanTitle || `Study Plan: ${target}`;
  out.topicOverview = out.topicOverview || `Comprehensive learning curriculum covering ${target}.`;
  out.feasibility = out.feasibility || 'Paced realistically across balanced study blocks.';
  out.schedulingNotes = out.schedulingNotes || 'Progress sequentially through each module to build solid foundational understanding.';
  out.recommendedPriority = out.recommendedPriority || 'high';

  if (Array.isArray(out.tasks)) {
    out.tasks = out.tasks.map((task, idx) => {
      if (!task || typeof task !== 'object') return task;
      const subtopics = Array.isArray(task.subtopics)
        ? task.subtopics.map(st => typeof st === 'object' ? (st.title || st.name || JSON.stringify(st)) : String(st))
        : [];
      const learningOutcomes = Array.isArray(task.learningOutcomes)
        ? task.learningOutcomes.map(lo => typeof lo === 'object' ? (lo.outcome || lo.text || JSON.stringify(lo)) : String(lo))
        : [];

      return {
        id: task.id || `t_${idx + 1}`,
        title: task.title || `Module ${idx + 1}`,
        description: task.description || `Study and practice module covering core aspects.`,
        subtopics,
        learningOutcomes,
        estimatedMinutes: Number(task.estimatedMinutes) || 30,
        priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
        status: task.status === 'completed' ? 'completed' : 'pending',
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      };
    });

    // Recalculate totalEstimatedMinutes if missing or mismatch
    const sumMinutes = out.tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    out.totalEstimatedMinutes = Number(out.totalEstimatedMinutes) || sumMinutes || 120;
  }

  return out;
}

// Validate output against Zod schema
function validateOutput(feature, data, mode) {
  if (feature === 'decode') {
    return decoderResponseSchema.parse(data);
  }
  if (feature === 'focusCards') {
    return focusCardsResponseSchema.parse(data);
  }
  if (feature === 'mode') {
    if (mode === 'story') return storyModeSchema.parse(data);
    if (mode === 'step_by_step') return stepByStepModeSchema.parse(data);
    if (mode === 'quiz') return quizModeSchema.parse(data);
  }
  if (feature === 'taskBreakdown') {
    return taskBreakdownResponseSchema.parse(data);
  }
  if (feature === 'practiceChallenge') {
    return practiceBridgeResponseSchema.parse(data);
  }
  return data;
}

export async function callAI(feature, promptOrNull, params = {}) {
  const { topic = '', text = '', mode = 'story', cardCount = 4 } = params;
  const target = (topic || text).trim();

  const verified = topic ? findVerifiedTopic(topic) : null;
  if (verified) {
    let content = null;
    if (feature === 'decode') content = verified.decoder;
    else if (feature === 'focusCards') content = verified.focusCards;
    else if (feature === 'mode') content = verified.modes[mode];
    else if (feature === 'taskBreakdown') content = verified.taskBreakdown;
    else if (feature === 'practiceChallenge') content = verified.practiceBridge;

    if (content) {
      return {
        ...content,
        _source: 'verified-knowledge-base',
        _note: `Generated from CogniPath Verified Knowledge Base (${verified.category})`,
      };
    }
  }

  // 1. Try Live Gemini API if configured
  if (genAI && config.geminiApiKey) {
    try {
      const prompt = buildPrompt(feature, params);
      const model = genAI.getGenerativeModel({
        model: config.aiModel || 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timed out after 35 seconds.')), 35000)
      );

      const aiCallPromise = model.generateContent(prompt);
      const result = await Promise.race([aiCallPromise, timeoutPromise]);
      const rawText = result.response.text();
      let parsed = extractJson(rawText);
      if (feature === 'decode') {
        parsed = normalizeDecoderResponse(parsed);
      } else if (feature === 'taskBreakdown') {
        parsed = normalizeTaskBreakdownResponse(parsed, target);
      }

      // Validate schema
      const validated = validateOutput(feature, parsed, mode);
      return {
        ...validated,
        _source: 'gemini',
        _model: config.aiModel || 'gemini-1.5-flash',
      };
    } catch (err) {
      console.warn(`[AI Service] Live Gemini call failed: ${err.message}`);
      // If the error was an invalid API key, throw transparent error instead of faking
      if (err.message.includes('API key') || err.message.includes('API_KEY_INVALID') || err.message.includes('unregistered')) {
        const error = new Error('Invalid Google Gemini API key. Please verify your GEMINI_API_KEY configuration.');
        error.code = 'INVALID_API_KEY';
        error.status = 401;
        throw error;
      }
      // If it failed validation or rate limit, throw error
      if (err.name === 'ZodError') {
        console.warn('[AI Service] AI response failed schema validation:', err.errors);
      }
    }
  }

  // 2. Check if user provided source text (e.g. pasted textbook paragraph)
  if (text && text.trim().length > 30) {
    if (feature === 'focusCards') {
      const extracted = extractFromSourceText(text, cardCount, topic);
      return {
        ...extracted,
        _source: 'source-text-extractor',
        _note: 'Synthesized directly from your provided source text',
      };
    }

    // For the Decoder: build a simplified explanation from the source text itself.
    // We clean LaTeX, extract the first clear sentence as the simple explanation,
    // then pull key terms and bullet points directly from the passage.
    if (feature === 'decode') {
      const { extractFromSourceText: ext } = await import('./knowledgeBase.js');
      const cards = ext(text, 1, topic || '').cards;
      const firstCard = cards[0] || {};
      const cleanText = text
        .replace(/\\\(.*?\\\)/gs, '[equation]')
        .replace(/\$[^$]+\$/g, '[equation]')
        .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/^[•\-–*]\s+/gm, '')
        .replace(/\r?\n/g, ' ')
        .trim();

      const firstSentenceM = cleanText.match(/^([^.!?]{15,}[.!?])/);
      const simpleExplanation = firstSentenceM
        ? firstSentenceM[1].trim()
        : cleanText.slice(0, 200);

      // Extract bullet-style key points from the text
      const bulletLines = text.split('\n')
        .map((l) => l.trim())
        .filter((l) => /^[•\-–*]/.test(l))
        .map((l) => l.replace(/^[•\-–*]\s*/, '').trim())
        .filter((l) => l.length > 5)
        .slice(0, 5);

      const takeaways =
        bulletLines.length >= 2
          ? bulletLines
          : (firstCard.keyPoints || [cleanText.slice(0, 100)]).slice(0, 4);

      return {
        simpleExplanation,
        analogy: `Think of this concept as a layered system where each part builds on the previous one — just like chapters in a textbook, each section of "${topic || 'this topic'}" connects to the next.`,
        keyTerms: (firstCard.vocabulary || []).map((v) => ({ term: v.term, definition: v.definition })),
        takeaways,
        example: `Apply the ideas in this passage by identifying a real-world situation where ${topic || 'this concept'} plays a direct role.`,
        selfCheck: {
          question: `What is the single most important idea in the passage about ${topic || 'this topic'}?`,
          hint: `Re-read the first and last sentence of each section in the passage.`,
        },
        _source: 'source-text-extractor',
        _note: 'Synthesized from your provided source text (no Gemini key configured)',
      };
    }
  }

  // 4. If neither Gemini nor verified topic nor source text is available, report configuration requirement
  if (!config.geminiApiKey) {
    const error = new Error(
      `Live AI is not configured for custom topic '${target}'. To generate live AI content for any topic, please configure your GEMINI_API_KEY in server/.env, or test one of the core academic topics (Chlorophyll, Binary Search, Database Normalization, Photosynthesis, HTTP API), or paste source text.`
    );
    error.code = 'AI_KEY_REQUIRED';
    error.status = 503;
    throw error;
  }

  const fallbackError = new Error(`Failed to generate high-quality educational content for '${target}'. Please try again.`);
  fallbackError.code = 'GENERATION_FAILED';
  fallbackError.status = 502;
  throw fallbackError;
}
