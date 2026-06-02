import { calculate, calculatorSchema } from '../tools/calculator.js';
import { convertCurrency, currencySchema } from '../tools/currency.js';
import { logger } from './logger.js';

export const allToolsSchemas = [
  calculatorSchema,
  currencySchema
];

const toolsMap = {
  calculate,
  convert_currency: convertCurrency
};

/**
 * Centrally executes a tool by name with safety checks and logs.
 */
export async function executeTool(name, input) {
  const toolFn = toolsMap[name];
  if (!toolFn) {
    throw new Error(`Tool not found: "${name}"`);
  }
  
  logger.toolCall(name, input);
  try {
    const result = await toolFn(input);
    logger.toolResult(name, result);
    return result;
  } catch (error) {
    logger.error(`Error executing tool "${name}": ${error.message}`);
    throw error;
  }
}
