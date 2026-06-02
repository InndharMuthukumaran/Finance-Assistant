import { calculate, calculatorSchema } from '../tools/calculator.js';
import { convertCurrency, currencySchema } from '../tools/currency.js';
import { addExpense, getExpenses, deleteExpense, expenseSchemas } from '../tools/expense.js';
import { analyzeBudget, budgetSchema } from '../tools/budget.js';
import { logger } from './logger.js';

// Expose all schemas to pass directly to Anthropic client tools parameter
export const allToolsSchemas = [
  calculatorSchema,
  currencySchema,
  ...expenseSchemas,
  budgetSchema
];

// Mapping schemas to implementation functions
const toolHandlers = {
  calculate,
  convert_currency: convertCurrency,
  add_expense: addExpense,
  get_expenses: getExpenses,
  delete_expense: deleteExpense,
  analyze_budget: analyzeBudget
};

/**
 * Execute a tool by name with the given inputs.
 * Handles logging success/error hook calls for visibility.
 */
export async function executeTool(name, input) {
  const handler = toolHandlers[name];
  if (!handler) {
    logger.toolError(name, `Handler not found`);
    throw new Error(`Execution error: Tool handler for "${name}" is not registered.`);
  }

  logger.toolCall(name, input);
  try {
    const result = await handler(input);
    logger.toolSuccess(name, result);
    return result;
  } catch (err) {
    logger.toolError(name, err.message);
    throw err;
  }
}
