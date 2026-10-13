import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'cognipath_fallback_dev_secret_key',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gemini-2.5-flash-lite',
  webSearchProvider: process.env.WEB_SEARCH_PROVIDER || 'tavily',
  webSearchApiKey: process.env.WEB_SEARCH_API_KEY || process.env.TAVILY_API_KEY || process.env.EXA_API_KEY || process.env.BRAVE_SEARCH_API_KEY || '',
  mongodbUri: process.env.MONGODB_URI || '',
};

if (!config.geminiApiKey) {
  console.info('[CogniPath] Notice: GEMINI_API_KEY not configured. Running with built-in educational intelligence generator.');
}
