import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is required. Set it in your .env or environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey);

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
/**
 * Converts an Anthropic-style tool schema to a Gemini functionDeclaration.
 * Anthropic uses "input_schema", Gemini uses "parameters".
 */
export function toGeminiFunction(anthropicSchema) {
  return {
    name: anthropicSchema.name,
    description: anthropicSchema.description,
    parameters: anthropicSchema.input_schema
  };
}

/**
 * Returns a configured Gemini model instance with tools registered.
 * @param {Array} anthropicSchemas - Array of Anthropic-style tool schemas
 */
export function getModel(anthropicSchemas = []) {
  const config = {
    model: DEFAULT_MODEL
  };

  if (anthropicSchemas.length > 0) {
    config.tools = [{
      functionDeclarations: anthropicSchemas.map(toGeminiFunction)
    }];
  }

  return genAI.getGenerativeModel(config);
}
