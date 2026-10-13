import mongoose from 'mongoose';

// 1. Shared Concept Decoder Cache
const sharedExplanationSchema = new mongoose.Schema(
  {
    topicNormalized: { type: String, required: true, index: true },
    conceptTitle: { type: String, required: true },
    level: { type: String, default: 'beginner' },
    simpleExplanation: { type: String, required: true },
    analogy: { type: String, required: true },
    keyTerms: [
      {
        term: String,
        definition: String,
        whyItMatters: String,
      },
    ],
    takeaways: [String],
    example: String,
    selfCheck: {
      question: String,
      hint: String,
    },
    sources: [
      {
        title: String,
        url: String,
        domain: String,
        snippet: String,
      },
    ],
    searchStatus: String,
    verificationNotes: String,
    hitCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// 2. Shared Focus Cards Collection
const sharedFocusCardsSchema = new mongoose.Schema(
  {
    topicNormalized: { type: String, required: true, index: true },
    title: { type: String, required: true },
    level: { type: String, default: 'beginner' },
    cardCount: { type: Number, default: 4 },
    estimatedReadingMinutes: Number,
    cards: [
      {
        id: String,
        sectionNumber: Number,
        title: String,
        mainIdea: String,
        explanation: String,
        keyPoints: [String],
        vocabulary: [
          {
            term: String,
            definition: String,
          },
        ],
        selfCheck: String,
      },
    ],
    hitCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// 3. Shared Study Plans & Curriculum Blueprint
const sharedStudyPlanSchema = new mongoose.Schema(
  {
    topicNormalized: { type: String, required: true, index: true },
    taskPlanTitle: { type: String, required: true },
    topicOverview: String,
    level: { type: String, default: 'beginner' },
    totalEstimatedMinutes: Number,
    recommendedPriority: String,
    feasibility: String,
    schedulingNotes: String,
    tasks: [
      {
        id: String,
        title: String,
        description: String,
        subtopics: [String],
        learningOutcomes: [String],
        estimatedMinutes: Number,
        priority: String,
        status: String,
        dependencies: [String],
      },
    ],
    hitCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// 4. User Personal Notes & Bookmarks
const userNoteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    noteTitle: { type: String, required: true },
    content: { type: String, required: true },
    tags: [String],
    sourceFeature: { type: String, enum: ['decoder', 'focus_cards', 'study_planner', 'general'], default: 'general' },
  },
  { timestamps: true }
);

export const SharedExplanation = mongoose.models.SharedExplanation || mongoose.model('SharedExplanation', sharedExplanationSchema);
export const SharedFocusCards = mongoose.models.SharedFocusCards || mongoose.model('SharedFocusCards', sharedFocusCardsSchema);
export const SharedStudyPlan = mongoose.models.SharedStudyPlan || mongoose.model('SharedStudyPlan', sharedStudyPlanSchema);
export const UserNote = mongoose.models.UserNote || mongoose.model('UserNote', userNoteSchema);
