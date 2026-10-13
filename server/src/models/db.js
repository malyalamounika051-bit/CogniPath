import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'cognipath.json');

// Initial default schema
const defaultData = {
  users: [],
  sessions: [],
  explanations: [],
  focusCards: [],
  taskPlans: [],
  challenges: [],
};

class Database {
  constructor() {
    this.data = { ...defaultData };
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all collections exist
        for (const key of Object.keys(defaultData)) {
          if (!this.data[key]) {
            this.data[key] = [];
          }
        }
      } else {
        this.save();
      }
    } catch (err) {
      console.error('[DB] Failed to load data from file, initializing fresh store:', err.message);
      this.data = { ...defaultData };
    }
  }

  save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to persist database:', err.message);
    }
  }

  // --- Users ---
  findUserByEmail(email) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.data.users.find((u) => u.id === id);
  }

  createUser(userData) {
    const user = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  // --- Sessions / History ---
  getHistory(userId) {
    const list = this.data.sessions.filter((s) => s.userId === userId || (!s.userId && userId === 'guest'));
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createSession(sessionData) {
    const session = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...sessionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  deleteSession(id, userId) {
    const index = this.data.sessions.findIndex((s) => s.id === id && (s.userId === userId || userId === 'guest'));
    if (index !== -1) {
      this.data.sessions.splice(index, 1);
      // Clean up linked data
      this.data.explanations = this.data.explanations.filter((e) => e.sessionId !== id);
      this.data.focusCards = this.data.focusCards.filter((f) => f.sessionId !== id);
      this.data.challenges = this.data.challenges.filter((c) => c.sessionId !== id);
      this.save();
      return true;
    }
    return false;
  }

  // --- Saved Explanations ---
  saveExplanation(explanationData) {
    const record = {
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...explanationData,
      createdAt: new Date().toISOString(),
    };
    this.data.explanations.push(record);
    this.save();
    return record;
  }

  getExplanationById(id, userId) {
    return this.data.explanations.find((e) => e.id === id && (e.userId === userId || userId === 'guest'));
  }

  // --- Focus Cards Collections ---
  saveFocusCards(collectionData) {
    const record = {
      id: 'fc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...collectionData,
      completedCardIds: collectionData.completedCardIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.focusCards.push(record);
    this.save();
    return record;
  }

  getFocusCardsById(id, userId) {
    return this.data.focusCards.find((f) => f.id === id && (f.userId === userId || userId === 'guest'));
  }

  updateFocusCardsProgress(id, completedCardIds, userId) {
    const record = this.getFocusCardsById(id, userId);
    if (!record) return null;
    record.completedCardIds = completedCardIds;
    record.updatedAt = new Date().toISOString();
    this.save();
    return record;
  }

  // --- Task Plans ---
  getTaskPlans(userId) {
    return this.data.taskPlans
      .filter((t) => t.userId === userId || (!t.userId && userId === 'guest'))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  getTaskPlanById(id, userId) {
    return this.data.taskPlans.find((t) => t.id === id && (t.userId === userId || userId === 'guest'));
  }

  createTaskPlan(planData) {
    const plan = {
      id: 'tp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...planData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.taskPlans.push(plan);
    this.save();
    return plan;
  }

  updateTaskPlanItem(planId, taskId, updates, userId) {
    const plan = this.getTaskPlanById(planId, userId);
    if (!plan) return null;
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) return null;

    Object.assign(task, updates);
    plan.updatedAt = new Date().toISOString();
    this.save();
    return plan;
  }

  updateTaskPlan(planId, updates, userId) {
    const plan = this.getTaskPlanById(planId, userId);
    if (!plan) return null;

    Object.assign(plan, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return plan;
  }

  deleteTaskPlan(planId, userId) {
    const index = this.data.taskPlans.findIndex((t) => t.id === planId && (t.userId === userId || userId === 'guest'));
    if (index !== -1) {
      this.data.taskPlans.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // --- Practice Challenges ---
  saveChallenge(challengeData) {
    const record = {
      id: 'ch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...challengeData,
      createdAt: new Date().toISOString(),
    };
    this.data.challenges.push(record);
    this.save();
    return record;
  }
}

export const db = new Database();
