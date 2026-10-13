# CogniPath — The Adaptive Student Intelligence Copilot

> **AI for Accessibility & Inclusion / Personalized AI Experiences**  
> Replace learning overwhelm with personalized understanding, adaptive multi-modal explanations, and clear next steps.

---

## 🚀 Local Access URLs

- **Frontend Application (Vite + React):** [http://localhost:5173/](http://localhost:5173/)
- **Backend REST API (Node.js + Express):** [http://localhost:5000/](http://localhost:5000/)
- **Health Check Endpoint:** [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 🌟 Implemented Features

### 1. Jargon-to-Analogy Decoder (`/decoder`)
- Translates dense, academic language into intuitive everyday explanations and relatable analogies.
- Generates key terms with concise definitions, 3–5 bulleted takeaways, practical examples, and self-check questions with revealable hints.
- Supports document uploads (`.txt`, `.md`, `.pdf`, `.docx`, `.json`) and direct copy to clipboard.

### 2. Bite-Sized Focus Cards & Reader (`/focus-cards`)
- Divides multi-paragraph academic texts into 2–6 bite-sized learning cards.
- Integrated **Focus Timer** with 5m, 15m, 25m, and custom study intervals to manage cognitive fatigue.
- Interactive card navigation, completion checkmarks, progress tracking, and **Zen Focus Mode**.

### 3. Adaptive Learning Switcher (`/learning-modes`)
- Switch the same topic seamlessly across 3 distinct formats without re-entering the concept:
  - **Story Mode:** Relatable narratives and analogies.
  - **Step-by-Step Logic Mode:** Sequential breakdown (Definition → Why it matters → How it works → Worked example → Common mistakes → Summary).
  - **Quiz Mode:** Interactive knowledge test with hidden answer keys, immediate feedback, and explanations.

### 4. Overwhelm-to-Action Breakdown (`/task-breakdown`)
- Turns large academic assignments or exam preparations into structured checklists with realistic time estimates.
- Allows students to add custom steps, edit estimates, delete tasks, and toggle completion.
- Evaluates feasibility against student deadlines and available daily study time.

### 5. Theory-to-Practice Bridge (`/practice-bridge`)
- Connects abstract theoretical concepts to realistic industry/academic scenarios.
- Delivers progressive hints that guide students without immediately revealing solutions.
- Includes reflection questions and an optional evaluation rubric / solution walkthrough.

### 6. Accessibility & Readability System (WCAG 2.2 AA)
- **Dyslexia-Friendly Mode:** High-legibility font styling with increased character and line spacing.
- **Warm Reading Tint:** Soothing background to reduce screen glare and eye strain.
- **Font Scaling:** Quick +/- text sizing directly in the top navigation.

### 7. Persistent Storage & Authentication
- Optional **Guest Mode** (instant access without sign-up barrier) and registered user accounts with JWT & bcrypt password hashing.
- Persistent storage for learning sessions, task plans, and saved explanations in `server/data/cognipath.json`.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, React Router v6, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express, Helmet, CORS, Rate-Limiting, Multer, Zod
- **AI Integration:** Google Gemini Generative AI SDK (`@google/generative-ai`) + CogniPath Educational Intelligence Engine fallback
- **Data Store:** File-backed persistent JSON database engine

---

## 🏃 Quick Start Guide

### 1. Install Dependencies
```bash
# Install frontend
cd client
npm install

# Install backend
cd ../server
npm install
```

### 2. Start Servers
From the root directory:
```bash
# Start backend API (Port 5000)
npm run dev:server

# Start frontend application (Port 5173)
npm run dev:client
```
Visit **[http://localhost:5173/](http://localhost:5173/)** in your browser.
