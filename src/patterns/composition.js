import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

export async function runCompositionDemo() {
  logger.info(`Starting Tool Composition Demo...`);
  console.log(`\n🧩 Demo: Tool Composition — Combining multiple tool results into a single workflow\n`);

  const model = getModel(allToolsSchemas);
  const chat = model.startChat();

  const prompt =
    "I want to convert €150 to USD, compare that against my total current expenses, " +
    "and estimate how much disposable cash I have left after expenses. Use tool composition where the conversion result feeds into a calculation.";

  logger.info(`Query: "${prompt}"`);
  const result = await chat.sendMessage(prompt);
  const response = result.response;
  logger.trackUsage(response.usageMetadata);
  const functionCalls = response.functionCalls();

  const toolResponses = [];
  const toolResults = {};

  if (functionCalls && functionCalls.length > 0) {
    logger.info(`Gemini requested ${functionCalls.length} tool call(s)`);
    for (const fc of functionCalls) {
      const toolResult = await executeTool(fc.name, fc.args);
      toolResults[fc.name] = toolResult;
      toolResponses.push({
        functionResponse: {
          name: fc.name,
          response: { result: JSON.stringify(toolResult) }
        }
      });
    }
  }

  if (!toolResults.convert_currency) {
    logger.info('Composition fallback: converting currency explicitly.');
    toolResults.convert_currency = await executeTool('convert_currency', {
      amount: 150,
      from: 'EUR',
      to: 'USD'
    });
    toolResponses.push({
      functionResponse: {
        name: 'convert_currency',
        response: { result: JSON.stringify(toolResults.convert_currency) }
      }
    });
  }

  if (!toolResults.track_expense) {
    logger.info('Composition fallback: fetching current total expenses explicitly.');
    toolResults.track_expense = await executeTool('track_expense', {
      action: 'total'
    });
    toolResponses.push({
      functionResponse: {
        name: 'track_expense',
        response: { result: JSON.stringify(toolResults.track_expense) }
      }
    });
  }

  const convertedAmount = toolResults.convert_currency.convertedAmount;
  const totalExpenses = parseFloat(toolResults.track_expense.total || 0);

  const composeResult = await executeTool('calculate', {
    operation: 'subtract',
    a: convertedAmount,
    b: totalExpenses
  });

  toolResponses.push({
    functionResponse: {
      name: 'calculate',
      response: { result: JSON.stringify(composeResult) }
    }
  });

  logger.info('Sending composed tool results back to Gemini for final synthesis...');
  const finalResult = await chat.sendMessage(toolResponses);
  logger.trackUsage(finalResult.response.usageMetadata);

  const answerText = finalResult.response.text();
  console.log(`\n💬 Gemini's Composed Answer:\n${answerText || 'No synthesized text available.'}\n`);
  logger.printSessionSummary();
}

