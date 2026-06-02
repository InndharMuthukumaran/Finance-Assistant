import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Tool Call Limits Pattern:
 * Implements a circuit breaker/counter. If the number of tool calls
 * exceeds a preconfigured ceiling (MAX_CALLS), we abort execution
 * to prevent infinite execution loops and unexpected token billing.
 */
export async function runLimitsDemo() {
  const prompt = "Calculate 10% of 500, then add 20 to the result, then multiply it by 3, then convert to EUR, then log it as an expense.";
  logger.info(`Starting Tool Limits Demo...`);
  logger.info(`Query: "${prompt}"`);

  let messages = [{ role: 'user', content: prompt }];
  let step = 1;
  const MAX_CALLS = 2; // Artificially low limit for demonstration

  logger.info(`Safety Guard active: MAX_TOOL_CALLS is set to ${MAX_CALLS}`);

  while (step <= 10) {
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

    // Check safety limit BEFORE executing the tool call in this step
    if (step > MAX_CALLS) {
      logger.error(`🛑 CIRCUIT BREAKER TRIGGERED: Maximum tool calls (${MAX_CALLS}) exceeded! Aborting agent loop.`);
      console.log(`\n❌ Execution terminated: Process stopped at step ${step} because it exceeded the safety threshold of ${MAX_CALLS} tool calls.\n`);
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
