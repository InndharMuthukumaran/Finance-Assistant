import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Error Recovery Pattern:
 * Demonstrates graceful error handling with:
 * 1. Retry logic with exponential backoff for transient failures
 * 2. Fallback strategies when primary tools fail
 * 3. User-friendly error messages
 * 4. Recovery without crashing the application
 */

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Initial delay in ms (grows exponentially)
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 500) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${maxRetries}...`);
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        const delayMs = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        logger.info(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
}

/**
 * Execute tool with error recovery
 * Attempts to execute a tool with retries and fallback handling
 */
async function executeToolWithRecovery(toolName, args, useFallback = true) {
  try {
    // Try with retry logic
    return await retryWithBackoff(
      () => executeTool(toolName, args),
      3,
      300
    );
  } catch (error) {
    logger.error(`Tool execution failed for '${toolName}': ${error.message}`);
    
    if (useFallback) {
      logger.info(`Attempting fallback for '${toolName}'...`);
      return provideFallbackResult(toolName, args, error);
    }
    
    throw error;
  }
}

/**
 * Provide fallback results when a tool fails
 */
function provideFallbackResult(toolName, args, originalError) {
  switch (toolName) {
    case 'convert_currency': {
      // Fallback: use approximate rates
      const staticRates = { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.3, JPY: 156 };
      const fromRate = staticRates[args.from?.toUpperCase()] || 1;
      const toRate = staticRates[args.to?.toUpperCase()] || 1;
      const rate = toRate / fromRate;
      return {
        amount: args.amount,
        from: args.from?.toUpperCase(),
        to: args.to?.toUpperCase(),
        convertedAmount: parseFloat((args.amount * rate).toFixed(2)),
        rate: parseFloat(rate.toFixed(6)),
        source: 'FALLBACK_RATES',
        warning: 'Using offline fallback rates due to API unavailability'
      };
    }
    
    case 'calculate': {
      // Fallback: still execute locally (calculation tools rarely fail)
      try {
        const { operation, a, b } = args;
        let result;
        switch (operation) {
          case 'add': result = a + b; break;
          case 'subtract': result = a - b; break;
          case 'multiply': result = a * b; break;
          case 'divide': result = a / b; break;
          case 'percentage': result = (a * b) / 100; break;
          default: throw new Error(`Unknown operation: ${operation}`);
        }
        return { result, source: 'LOCAL_CALC' };
      } catch (e) {
        throw new Error(`Calculation failed and fallback unavailable: ${e.message}`);
      }
    }
    
    case 'manage_budget':
      return {
        success: false,
        error: 'Budget service unavailable',
        message: 'Please try again later or contact support',
        originalError: originalError.message
      };
    
    case 'track_expense':
      return {
        success: false,
        error: 'Expense tracking temporarily unavailable',
        message: 'Your expense will be queued for processing',
        originalError: originalError.message
      };
    
    default:
      throw new Error(`No fallback strategy for tool: ${toolName}`);
  }
}

/**
 * Main error recovery demo function
 * Simulates scenarios with potential failures and recovers gracefully
 */
export async function runErrorRecoveryDemo() {
  logger.info(`Starting Error Recovery Pattern Demo...`);
  console.log(`\n📋 Demo: Error Recovery with Retries & Fallbacks\n`);

  const model = getModel(allToolsSchemas);
  const chat = model.startChat();

  // Prompt designed to trigger multiple tool calls
  const prompt = 
    "I need to check my groceries budget, calculate 20% tax on a $500 expense, " +
    "and convert $100 USD to EUR. Can you help?";

  logger.info(`Query: "${prompt}"`);

  try {
    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      console.log(`\n💬 Gemini's Response:\n${response.text()}\n`);
      logger.printSessionSummary();
      return;
    }

    logger.info(`Gemini requested ${functionCalls.length} tool call(s)`);
    
    // Execute tools with error recovery
    const toolResponses = [];
    for (const fc of functionCalls) {
      try {
        logger.info(`Processing: ${fc.name}`);
        const toolResult = await executeToolWithRecovery(fc.name, fc.args, true);
        
        toolResponses.push({
          functionResponse: {
            name: fc.name,
            response: { result: JSON.stringify(toolResult) }
          }
        });
      } catch (error) {
        logger.error(`Unrecoverable error for ${fc.name}: ${error.message}`);
        // Include error in response so Gemini knows what failed
        toolResponses.push({
          functionResponse: {
            name: fc.name,
            response: { 
              error: error.message,
              result: JSON.stringify({ 
                success: false, 
                error: error.message 
              })
            }
          }
        });
      }
    }

    logger.info(`Sending ${toolResponses.length} tool results back to Gemini...`);
    const finalResult = await chat.sendMessage(toolResponses);
    console.log(`\n💬 Gemini's Final Response:\n${finalResult.response.text()}\n`);

  } catch (error) {
    logger.error(`Fatal error in recovery demo: ${error.message}`);
    console.log(`\n❌ Recovery failed: ${error.message}\n`);
  }

  logger.printSessionSummary();
}
