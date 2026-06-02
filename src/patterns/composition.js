import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';
import { addExpense } from '../tools/expense.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPENSE_FILE_PATH = path.resolve(__dirname, '../data/expenses.json');

/**
 * Tool Composition Pattern:
 * Combines multiple atomic tools (addExpense, convertCurrency, getExpenses, analyzeBudget)
 * in sequence/parallel steps to build a high-level composite workflow.
 */
export async function runCompositionDemo() {
  logger.info(`Starting Tool Composition Demo...`);
  
  // Clear and seed test database
  logger.info(`Seeding initial expenses for composition...`);
  fs.writeFileSync(EXPENSE_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
  await addExpense({ description: "Office Cloud Hosting", amount: 200, currency: "USD", category: "utilities" });
  await addExpense({ description: "Lunch Buffet", amount: 150, currency: "EUR", category: "food" });
  await addExpense({ description: "Client Taxi Service", amount: 4500, currency: "INR", category: "transportation" });

  const prompt = "Add a new expense of $45 for Dinner under food, then run a budget analysis with a $600 USD limit to tell me my total USD spending, category breakdown, and remaining budget.";
  logger.info(`Query: "${prompt}"`);

  let messages = [{ role: 'user', content: prompt }];
  let step = 1;

  while (step < 6) {
    logger.info(`Step ${step} - Requesting action from Claude...`);
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1500,
      tools: allToolsSchemas,
      messages
    });

    logger.trackUsage(response.usage);

    if (response.stop_reason !== 'tool_use') {
      console.log(`\n💬 Claude's Final Response:\n${response.content[0].text}\n`);
      break;
    }

    const toolCalls = response.content.filter(b => b.type === 'tool_use');
    if (toolCalls.length === 0) {
      break;
    }

    // Concurrently execute whatever tools are requested in this turn
    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await executeTool(toolCall.name, toolCall.input);
        return {
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(result)
        };
      })
    );

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: results });
    
    step++;
  }

  logger.printSessionSummary();
}
