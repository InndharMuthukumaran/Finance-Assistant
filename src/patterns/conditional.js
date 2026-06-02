import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPENSE_FILE_PATH = path.resolve(__dirname, '../data/expenses.json');

/**
 * Conditional Tool Calling Pattern:
 * Branching paths in tool calls. Here, if the currency is not USD,
 * Claude must conditionally call convert_currency BEFORE calling add_expense.
 */
export async function runConditionalDemo() {
  logger.info(`Starting Conditional Tool Calling Demo...`);
  
  // Clear file
  fs.writeFileSync(EXPENSE_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');

  const prompt = "Log an expense of 120 EUR for Dinner in Paris. (Rule: non-USD expenses must be converted to USD first).";
  logger.info(`Query: "${prompt}"`);

  let messages = [{ role: 'user', content: prompt }];
  let step = 1;

  while (step < 5) {
    logger.info(`Step ${step} - Requesting action from Claude...`);
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      tools: allToolsSchemas,
      messages
    });

    logger.trackUsage(response.usage);

    if (response.stop_reason !== 'tool_use') {
      console.log(`\n💬 Claude's Final Response:\n${response.content[0].text}\n`);
      break;
    }

    const toolCall = response.content.find(b => b.type === 'tool_use');
    if (!toolCall) {
      break;
    }

    const result = await executeTool(toolCall.name, toolCall.input);

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(result)
        }
      ]
    });

    step++;
  }

  logger.printSessionSummary();
}
