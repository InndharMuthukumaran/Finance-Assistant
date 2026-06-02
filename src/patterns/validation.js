import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Validation & Self-Correction Pattern:
 * Intercepts tool calls to validate inputs. If a validation rule is violated,
 * we return a descriptive validation error. Claude parses the error and
 * self-corrects the inputs for its next tool call.
 */
export async function runValidationDemo() {
  const prompt = "Please log an expense for a subscription refund: -45 USD for 'AWS Refund'.";
  logger.info(`Starting Validation & Correction Demo...`);
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

    let result;
    let isError = false;

    // Direct input validation check before execution
    try {
      if (toolCall.name === 'add_expense' && toolCall.input.amount <= 0) {
        throw new Error(`Validation Error: Expense amount must be a positive number. You provided ${toolCall.input.amount}. Negative numbers are disallowed. If this is a refund, log it as a positive amount with 'Refund' in the description.`);
      }
      result = await executeTool(toolCall.name, toolCall.input);
    } catch (err) {
      logger.warn(`Validation check caught issue: ${err.message}`);
      result = { error: err.message };
      isError = true;
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(result),
          is_error: isError
        }
      ]
    });

    step++;
  }

  logger.printSessionSummary();
}
