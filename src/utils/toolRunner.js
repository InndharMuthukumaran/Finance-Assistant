import { calculate, calculatorSchema } from '../tools/calculator.js';
import { convertCurrency, currencySchema } from '../tools/currency.js';
import { manageBudget, budgetSchema } from '../tools/budget.js';
import { trackExpense, expenseSchema } from '../tools/expense.js';
import { lookupFinancialKnowledge, knowledgeSchema } from '../tools/knowledge.js';
import { logger } from './logger.js';
import { toolCache } from './cache.js';

export const allToolsSchemas = [calculatorSchema, currencySchema, budgetSchema, expenseSchema, knowledgeSchema];

const toolsMap = {
  calculate,
  convert_currency: convertCurrency,
  manage_budget: manageBudget,
  track_expense: trackExpense,
  lookup_financial_knowledge: lookupFinancialKnowledge
};

/**
 * Centrally executes a tool by name with safety checks, logs, and optional caching.
 */
export async function executeTool(name, input, options = { useCache: false }) {
  const toolFn = toolsMap[name];
  if (!toolFn) {
    throw new Error(`Tool not found: "${name}"`);
  }
  
  if (options.useCache) {
    const cachedResult = toolCache.get(name, input);
    if (cachedResult !== null) {
      logger.info(`[CACHE HIT] Reusing cached result for tool "${name}"`);
      // Display the cached result
      logger.toolSuccess(`${name} (FROM CACHE)`, cachedResult);
      return cachedResult;
    }
    logger.info(`[CACHE MISS] No cache entry found for tool "${name}". Executing tool...`);
  }

  logger.toolCall(name, input);
  try {
    const result = await toolFn(input);
    logger.toolSuccess(name, result);
    
    if (options.useCache) {
      toolCache.set(name, input, result);
      logger.info(`[CACHE STORED] Saved result for tool "${name}" in cache.`);
    }
    return result;
  } catch (error) {
    logger.error(`Error executing tool "${name}": ${error.message}`);
    throw error;
  }
}

