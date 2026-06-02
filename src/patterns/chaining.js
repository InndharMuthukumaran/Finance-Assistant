import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Tool Chaining Pattern:
 * The output of one tool call is fed back to the LLM, which then
 * triggers a second tool call using the output of the first tool.
 */
export async function runChainingDemo() {
  const prompt = "Calculate 15% of $8000 and then convert that amount into EUR.";
  logger.info(`Starting Tool Chaining Demo...`);
  logger.info(`Query: "${prompt}"`);

  let messages = [{ role: 'user', content: prompt }];
  let step = 1;

  while (step < 5) {
    logger.info(`Step ${step} - Requesting next action from Claude...`);
    
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
      logger.warn(`Stop reason was tool_use but no tool block found.`);
      break;
    }

    // Execute the tool and capture the result
    const result = await executeTool(toolCall.name, toolCall.input);

    // Update conversation state with the assistant message and the tool output
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
