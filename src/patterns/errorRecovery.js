import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Error Recovery Pattern:
 * When tool execution throws an error (e.g. division by zero, invalid input),
 * we catch the error, format it, flag it as is_error: true, and send it back to Claude.
 * This lets Claude explain the issue or self-correct the inputs.
 */
export async function runErrorRecoveryDemo() {
  const prompt = "Please convert 100 XYZ to USD, and if that fails, explain the problem and divide 100 by 0 to see what happens.";
  logger.info(`Starting Error Recovery Demo...`);
  logger.info(`Query: "${prompt}"`);

  let messages = [{ role: 'user', content: prompt }];
  let step = 1;

  while (step < 4) {
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

    try {
      result = await executeTool(toolCall.name, toolCall.input);
    } catch (err) {
      logger.warn(`Tool failure intercepted for '${toolCall.name}': ${err.message}`);
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
