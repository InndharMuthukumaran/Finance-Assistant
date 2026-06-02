import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

async function testQuery(prompt) {
  logger.info(`\nPrompt: "${prompt}"`);
  
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    tools: allToolsSchemas,
    messages: [{ role: 'user', content: prompt }]
  });

  logger.trackUsage(response.usage);

  if (response.stop_reason === 'tool_use') {
    const toolCall = response.content.find(b => b.type === 'tool_use');
    logger.info(`🎯 Tool selected: ${toolCall.name}`);
    const result = await executeTool(toolCall.name, toolCall.input);
    logger.info(`Result:`, result);
  } else {
    logger.info(`🎯 No tool selected. Answered directly.`);
    console.log(`💬 Response: ${response.content[0].text}`);
  }
}

/**
 * Dynamic Tool Selection Pattern:
 * Evaluates different prompts to demonstrate Claude choosing
 * the correct tool based on description and parameter definitions.
 */
export async function runDynamicSelectionDemo() {
  logger.info(`Starting Dynamic Tool Selection Demo...`);
  
  await testQuery("Multiply 45 by 22");
  await testQuery("How much is 100 GBP in EUR?");
  await testQuery("List my expenses");
  await testQuery("What does budget mean in business?");
  
  logger.printSessionSummary();
}
