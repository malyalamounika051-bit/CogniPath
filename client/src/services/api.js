const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

function getAuthHeader() {
  const token = localStorage.getItem('cognipath_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.code = data.error?.code || 'API_ERROR';
    err.status = response.status;
    throw err;
  }
  return data.data;
}

export const api = {
  // Health
  checkHealth: async () => {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(res);
  },

  // Auth
  register: async (name, email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(res);
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  firebaseAuth: async (firebaseUserData) => {
    const res = await fetch(`${API_BASE_URL}/auth/firebase-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firebaseUserData),
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  updatePreferences: async (preferences) => {
    const res = await fetch(`${API_BASE_URL}/auth/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ preferences }),
    });
    return handleResponse(res);
  },

  setApiKey: async (apiKey) => {
    const res = await fetch(`${API_BASE_URL}/auth/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ apiKey }),
    });
    return handleResponse(res);
  },

  // Learning Features
  decodeJargon: async (text, level, topic) => {
    const res = await fetch(`${API_BASE_URL}/learning/decode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ text, level, topic }),
    });
    return handleResponse(res);
  },

  createFocusCards: async (text, cardCount, level, title) => {
    const res = await fetch(`${API_BASE_URL}/learning/focus-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ text, cardCount, level, title }),
    });
    return handleResponse(res);
  },

  updateFocusCardsProgress: async (id, completedCardIds) => {
    const res = await fetch(`${API_BASE_URL}/learning/focus-cards/${id}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ completedCardIds }),
    });
    return handleResponse(res);
  },

  adaptMode: async (topic, mode, level) => {
    const res = await fetch(`${API_BASE_URL}/learning/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ topic, mode, level }),
    });
    return handleResponse(res);
  },

  evaluateQuizAnswer: async (questionId, selectedIndex, correctAnswerIndex) => {
    const res = await fetch(`${API_BASE_URL}/learning/quiz/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ questionId, selectedIndex, correctAnswerIndex }),
    });
    return handleResponse(res);
  },

  createPracticeChallenge: async (topic, subject, level) => {
    const res = await fetch(`${API_BASE_URL}/learning/practice-challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ topic, subject, level }),
    });
    return handleResponse(res);
  },

  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/learning/upload`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    return handleResponse(res);
  },

  // Task Breakdown
  breakdownTask: async (title, deadline, dailyAvailableMinutes, level) => {
    const res = await fetch(`${API_BASE_URL}/tasks/breakdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ title, deadline, dailyAvailableMinutes, level }),
    });
    return handleResponse(res);
  },

  getTaskPlans: async () => {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  updateTaskItem: async (planId, taskId, updates) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${planId}/items/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates),
    });
    return handleResponse(res);
  },

  updateTaskPlan: async (planId, updates) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates),
    });
    return handleResponse(res);
  },

  deleteTaskPlan: async (planId) => {
    const res = await fetch(`${API_BASE_URL}/tasks/${planId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // History
  getHistory: async () => {
    const res = await fetch(`${API_BASE_URL}/history`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  getExplanation: async (id) => {
    const res = await fetch(`${API_BASE_URL}/history/explanation/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  deleteHistoryItem: async (id) => {
    const res = await fetch(`${API_BASE_URL}/history/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },
};
