import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Tool Chaining Pattern:
 * The output of one tool call is fed back to Gemini, which then
 * triggers a second tool call using the result of the first.
 */
export async function runChainingDemo() {
  const prompt = "Calculate 15% of $8000 and then convert that amount into EUR.";
  logger.info(`Starting Tool Chaining Demo...`);
  logger.info(`Query: "${prompt}"`);

  const model = getModel(allToolsSchemas);
  const chat = model.startChat();

  // First message is the user's text prompt
  let nextMessage = prompt;
  let step = 1;

  while (step <= 5) {
    logger.info(`Step ${step} - Sending message to Gemini...`);

    const result = await chat.sendMessage(nextMessage);
    const response = result.response;
    const functionCalls = response.functionCalls();

    // No more tool calls → Gemini has the final answer
    if (!functionCalls || functionCalls.length === 0) {
      console.log(`\n💬 Gemini's Final Response:\n${response.text()}\n`);
      break;
    }

    // Take the first tool call Gemini requested
    const fc = functionCalls[0];
    logger.info(`  → Gemini wants to call: "${fc.name}" with args: ${JSON.stringify(fc.args)}`);

    // Execute the tool locally
    const toolResult = await executeTool(fc.name, fc.args);

    // The next "message" we send back is the tool's result
    nextMessage = [{
      functionResponse: {
        name: fc.name,
        response: { result: JSON.stringify(toolResult) }
      }
    }];

    step++;
  }

  logger.printSessionSummary();
}
