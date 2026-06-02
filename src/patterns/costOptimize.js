import { convertCurrency } from '../tools/currency.js';
import { cache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

/**
 * Cost Optimization / Caching Pattern:
 * Demonstrates how caching static or semi-static operations (like currency conversions)
 * reduces external network latency, protects API rate limits, and lowers compute overhead.
 */
export async function runCostOptimizeDemo() {
  logger.info(`Starting Cost Optimization (Cache) Demo...`);
  
  // Reset cache to ensure clear test
  cache.clear();

  const params = { amount: 250, from: "EUR", to: "USD" };

  logger.info(`\n--- FIRST CALL (Expect API Fetch / Cache Miss) ---`);
  const start1 = Date.now();
  const result1 = await convertCurrency(params);
  const time1 = Date.now() - start1;
  
  logger.info(`Result: ${result1.amount} ${result1.from} = ${result1.convertedAmount} ${result1.to}`);
  logger.info(`Response Time: ${time1}ms`);

  logger.info(`\n--- SECOND CALL (Expect Cache Hit / No API request) ---`);
  const start2 = Date.now();
  const result2 = await convertCurrency(params);
  const time2 = Date.now() - start2;

  logger.info(`Result: ${result2.amount} ${result2.from} = ${result2.convertedAmount} ${result2.to}`);
  logger.info(`Response Time: ${time2}ms`);

  const multiplier = (time1 / (time2 || 1)).toFixed(1);
  logger.info(`\n🚀 Cost & Speed Optimization Result: Cache hit was ${multiplier}x faster!`);
  logger.printSessionSummary();
}
