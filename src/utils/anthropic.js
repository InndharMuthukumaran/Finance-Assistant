import Anthropic from '@anthropic-ai/sdk';
import config from './config.js';

if (!config.apiKey) {
  console.error('❌ CRITICAL ERROR: ANTHROPIC_API_KEY environment variable is missing in .env');
  process.exit(1);
}

export const anthropic = new Anthropic({
  apiKey: config.apiKey,
});

export const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
