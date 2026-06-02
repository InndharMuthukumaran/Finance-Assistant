import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const config = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',
  maxToolCalls: parseInt(process.env.MAX_TOOL_CALLS || '10', 10),
  cacheTtl: parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10),
};

// Simple check
if (!config.apiKey) {
  console.warn('⚠️ WARNING: ANTHROPIC_API_KEY is not set in your .env file.');
}

export default config;
