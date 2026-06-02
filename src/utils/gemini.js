import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

let genAI;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  // Fallback mock implementation so examples can run without a real API key.
  console.warn('⚠️ GEMINI_API_KEY not set — using local mock Gemini for examples.');

  const makeChat = () => {
    // Simple stateful chat simulator that understands the two example prompts
    return {
      async sendMessage(message) {
        // Normalize message form
        const isArray = Array.isArray(message);

        const makeResponse = (text, functionCalls = []) => ({
          response: {
            text: () => text,
            functionCalls: () => functionCalls
          }
        });

        if (isArray) {
          // Received functionResponses from tools — craft final text
          const results = message.map(m => {
            const name = m.functionResponse?.name;
            const res = JSON.parse(m.functionResponse?.response?.result || '{}');
            return { name, res };
          });

          // Simple aggregator for the parallel example
          const conv = results.find(r => r.name === 'convert_currency');
          const tax = results.find(r => r.name === 'calculate');
          const convText = conv ? `${conv.res.amount} ${conv.res.from} ≈ ${conv.res.convertedAmount} ${conv.res.to}` : '';
          const taxText = tax ? `Tax: ${tax.res.result}` : '';
          return makeResponse(`${convText} ${taxText}`.trim());
        }

        const text = String(message || '').toLowerCase();

        // Parallel example trigger
        if (text.includes('convert 250 eur to usd') && text.includes('18%')) {
          return makeResponse('Mock: requesting two tool calls', [
            { name: 'convert_currency', args: { amount: 250, from: 'EUR', to: 'USD' } },
            { name: 'calculate', args: { operation: 'percentage', a: 1500, b: 18 } }
          ]);
        }

        // Chaining example first step
        if (text.includes('15% of $8000') || text.includes('15% of 8000')) {
          return makeResponse('Mock: requesting a calculate tool call', [
            { name: 'calculate', args: { operation: 'percentage', a: 8000, b: 15 } }
          ]);
        }

        // If message looks like a functionResponse array with a calculate result, request convert
        try {
          const maybe = JSON.stringify(message || '');
          if (maybe.includes('functionResponse') && maybe.includes('calculate')) {
            // Extract numeric value heuristically
            const numMatch = maybe.match(/\d+(?:\.\d+)?/);
            const amount = numMatch ? Number(numMatch[0]) : 1200;
            return makeResponse('Mock: requesting convert_currency', [
              { name: 'convert_currency', args: { amount, from: 'USD', to: 'EUR' } }
            ]);
          }
        } catch (e) {
          // fallthrough
        }

        // Default fallback text
        return makeResponse('Mock Gemini response: no tools requested.');
      }
    };
  };

  genAI = {
    getGenerativeModel: () => ({
      startChat: () => makeChat()
    })
  };
}

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
