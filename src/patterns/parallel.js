import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Parallel Tool Calling Pattern:
 * Claude returns multiple tool_use blocks in a single turn.
 * We resolve all of them concurrently using Promise.all to optimize latency.
 */
export async function runParallelDemo() {
  const prompt = "Please convert 250 EUR to USD, and also calculate the 18% tax on a 1500 USD expense.";
  logger.info(`Starting Parallel Tool Calling Demo...`);
  logger.info(`Query: "${prompt}"`);

  const messages = [{ role: 'user', content: prompt }];

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    tools: allToolsSchemas,
    messages
  });

  logger.trackUsage(response.usage);

  const toolCalls = response.content.filter(block => block.type === 'tool_use');
  
  if (toolCalls.length === 0) {
    logger.warn(`No tools were called. Response: ${response.content[0].text}`);
    return;
  }

  logger.info(`Claude requested ${toolCalls.length} tool calls in parallel.`);

  // Resolve all promises concurrently
  const toolResults = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const result = await executeTool(toolCall.name, toolCall.input);
      return {
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: JSON.stringify(result)
      };
    })
  );

  logger.info(`Sending parallel tool results back to Claude...`);

  const followUp = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    tools: allToolsSchemas,
    messages: [
      ...messages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults }
    ]
  });

  logger.trackUsage(followUp.usage);
  
  console.log(`\n💬 Claude's Final Response:\n${followUp.content[0].text}\n`);
  logger.printSessionSummary();
}
