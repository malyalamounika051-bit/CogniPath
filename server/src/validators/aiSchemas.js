import { z } from 'zod';

// Forbidden placeholder phrases that signify ungrounded boilerplate
const BANNED_PLACEHOLDER_REGEX = /\b(bustling craft workshop|master craftsman|Factor\s+[1-9]|aspect\s+[1-9]\s+of\s+The\s+word|restaurant kitchen waiter|relationship between inputs and outcomes|boundary conditions where normal behavior)\b/i;

function noGenericPlaceholders(val) {
  if (typeof val === 'string') {
    return !BANNED_PLACEHOLDER_REGEX.test(val);
  }
  return true;
}

// 1. Decoder Schema
export const sourceCitationSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  domain: z.string().min(1),
  snippet: z.string().optional(),
  supportedClaims: z.string().optional(),
  publishedDate: z.string().optional(),
});

export const decoderResponseSchema = z.object({
  conceptTitle: z.string().min(2).optional(),
  simpleExplanation: z.string().min(20).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  analogy: z.string().min(20).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  keyTerms: z.array(
    z.object({
      term: z.string().min(2),
      definition: z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
      whyItMatters: z.string().optional(),
    })
  ).min(2),
  takeaways: z.array(z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' })).min(2).max(6),
  example: z.string().min(15).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  selfCheck: z.object({
    question: z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
    hint: z.string().min(5),
  }),
  sources: z.array(sourceCitationSchema).optional().default([]),
  searchStatus: z.enum([
    'researching',
    'completed_with_sources',
    'completed_with_limited_evidence',
    'search_unavailable',
    'failed'
  ]).optional().default('completed_with_limited_evidence'),
  verificationNotes: z.string().optional(),
});

// 2. Focus Cards Schema
export const focusCardItemSchema = z.object({
  id: z.string(),
  sectionNumber: z.number().int().positive().optional(),
  title: z.string().min(3).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  mainIdea: z.string().min(15).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  explanation: z.string().min(20).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  keyPoints: z.array(z.string().min(5).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' })).min(1),
  vocabulary: z.array(
    z.object({
      term: z.string().min(2).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
      definition: z.string().min(5).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
    })
  ).optional().default([]),
  selfCheck: z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
});

export const focusCardsResponseSchema = z.object({
  title: z.string().min(3).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  estimatedReadingMinutes: z.number().positive(),
  cards: z.array(focusCardItemSchema).min(2).refine((cards) => {
    // Verify each card has a distinct title
    const titles = cards.map((c) => c.title.toLowerCase().trim());
    return new Set(titles).size === titles.length;
  }, { message: 'Focus cards must have distinct titles' }),
});

// 3. Learning Modes Schemas
export const storyModeSchema = z.object({
  mode: z.literal('story'),
  storyTitle: z.string().min(5).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  storyText: z.string().min(50).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  conceptConnection: z.string().min(20).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  moralOrInsight: z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
});

export const stepByStepModeSchema = z.object({
  mode: z.literal('step_by_step'),
  whatItMeans: z.string().min(15).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  whyItMatters: z.string().min(15).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  howItWorks: z.array(z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' })).min(3),
  workedExample: z.string().min(15).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  commonMistake: z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  summary: z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
});

export const quizQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  options: z.array(z.string().min(2).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' })).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const quizModeSchema = z.object({
  mode: z.literal('quiz'),
  questions: z.array(quizQuestionSchema).min(2),
});

// 4. Task Breakdown Schema
export const taskItemSchema = z.object({
  id: z.string(),
  title: z.string().min(3).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  description: z.string().min(5).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  subtopics: z.array(z.string().min(2)).optional().default([]),
  learningOutcomes: z.array(z.string().min(2)).optional().default([]),
  estimatedMinutes: z.number().int().positive(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  status: z.enum(['pending', 'completed']).default('pending'),
  dependencies: z.array(z.string()).optional().default([]),
});

export const taskBreakdownResponseSchema = z.object({
  taskPlanTitle: z.string().min(3).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  topicOverview: z.string().optional(),
  totalEstimatedMinutes: z.number().int().positive(),
  recommendedPriority: z.enum(['high', 'medium', 'low']).default('high'),
  feasibility: z.string().min(5).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  schedulingNotes: z.string().min(5).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  tasks: z.array(taskItemSchema).min(3),
});

// 5. Practice Bridge Schema
export const practiceBridgeResponseSchema = z.object({
  conceptSummary: z.string().min(20).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  scenario: z.string().min(30).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  challenge: z.string().min(30).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  requirements: z.array(z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' })).min(2),
  hints: z.array(z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' })).min(2),
  expectedOutcome: z.string().min(20).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
  reflectionQuestions: z.array(z.string().min(10).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' })).min(2),
  optionalSolution: z.string().min(30).refine(noGenericPlaceholders, { message: 'Contains generic placeholder' }),
});
