import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Parallel Tool Calling Pattern:
 * Gemini returns multiple functionCall parts in a single response.
 * We resolve all of them concurrently using Promise.all to optimize latency.
 */
export async function runParallelDemo() {
  const prompt = "Please convert 250 EUR to USD, and also calculate the 18% tax on a 1500 USD expense.";
  logger.info(`Starting Parallel Tool Calling Demo...`);
  logger.info(`Query: "${prompt}"`);

  const model = getModel(allToolsSchemas);
  const chat = model.startChat();

  // Send the prompt to Gemini
  const result = await chat.sendMessage(prompt);
  const response = result.response;
  logger.trackUsage(response.usageMetadata);
  const functionCalls = response.functionCalls();

  if (!functionCalls || functionCalls.length === 0) {
    console.log(`\n💬 Gemini's Response:\n${response.text()}\n`);
    logger.printSessionSummary();
    return;
  }

  logger.info(`Gemini requested ${functionCalls.length} tool call(s) in parallel.`);

  // Execute ALL tool calls concurrently using Promise.all
  const toolResponses = await Promise.all(
    functionCalls.map(async (fc) => {
      logger.info(`  → Executing tool in parallel: "${fc.name}"`);
      const toolResult = await executeTool(fc.name, fc.args);
      return {
        functionResponse: {
          name: fc.name,
          response: { result: JSON.stringify(toolResult) }
        }
      };
    })
  );

  logger.info(`Sending all ${toolResponses.length} parallel results back to Gemini...`);

  // Send all results back to Gemini in one shot
  const finalResult = await chat.sendMessage(toolResponses);
  logger.trackUsage(finalResult.response.usageMetadata);
  console.log(`\n💬 Gemini's Final Response:\n${finalResult.response.text()}\n`);

  logger.printSessionSummary();
}
