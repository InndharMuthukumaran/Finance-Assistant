import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

export async function runConditionalDemo() {
  logger.info(`Starting Conditional Tool Calling Demo...`);
  console.log(`\n🔀 Demo: Conditional Tool Calling — decide whether to call tools based on context and results\n`);

  const model = getModel(allToolsSchemas);
  const chat = model.startChat();

  const prompt =
    "I have a $200 entertainment budget and already spent $180. If I spend $40 tonight, " +
    "will I still be within budget? Call tools only if they help answer the question.";

  logger.info(`Query: "${prompt}"`);
  const result = await chat.sendMessage(prompt);
  const response = result.response;
  logger.trackUsage(response.usageMetadata);
  const functionCalls = response.functionCalls();

  if (!functionCalls || functionCalls.length === 0) {
    console.log(`\n💬 Gemini decided no tools were needed:\n${response.text()}\n`);
    logger.printSessionSummary();
    return;
  }

  const toolResponses = [];
  const executedResults = {};

  for (const fc of functionCalls) {
    const toolResult = await executeTool(fc.name, fc.args);
    executedResults[fc.name] = toolResult;
    toolResponses.push({
      functionResponse: {
        name: fc.name,
        response: { result: JSON.stringify(toolResult) }
      }
    });
  }

  const budgetInfo = executedResults.manage_budget;
  if (budgetInfo && typeof budgetInfo.remaining === 'number') {
    const dinnerCost = 40;
    if (budgetInfo.remaining < dinnerCost) {
      logger.info('Remaining budget is below dinner cost, calling calculate conditionally.');
      const shortfall = await executeTool('calculate', {
        operation: 'subtract',
        a: dinnerCost,
        b: budgetInfo.remaining
      });
      toolResponses.push({
        functionResponse: {
          name: 'calculate',
          response: { result: JSON.stringify(shortfall) }
        }
      });
    } else {
      logger.info('Remaining budget covers the dinner cost, no additional tool needed.');
    }
  }

  logger.info('Sending conditional tool results back to Gemini for final decision...');
  const finalResult = await chat.sendMessage(toolResponses);
  logger.trackUsage(finalResult.response.usageMetadata);
  const answerText = finalResult.response.text();
  console.log(`\n💬 Gemini's Conditional Answer:\n${answerText || 'No synthesized text available.'}\n`);
  logger.printSessionSummary();
}

