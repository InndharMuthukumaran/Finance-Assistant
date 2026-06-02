import { orchestrate } from '../agents/orchestrator.js';
import { logger } from '../utils/logger.js';

/**
 * Multi-Agent Pattern:
 * Employs a master Orchestrator agent that inspects user queries
 * and delegates tasks to specialized sub-agents (Calculator, Research).
 */
export async function runMultiAgentDemo() {
  logger.info(`Starting Multi-Agent Routing Demo...`);

  // Query 1: Math heavy (should route to CalculatorAgent)
  const query1 = "Calculate the total: 1250 + 850 + (12% of 400).";
  const result1 = await orchestrate(query1);
  console.log(`\n💬 Result 1:\n${result1}\n`);
  console.log('='.repeat(40));

  // Query 2: Data/Exchange rate heavy (should route to ResearchAgent)
  const query2 = "Convert 500 CAD to EUR using live exchange rates.";
  const result2 = await orchestrate(query2);
  console.log(`\n💬 Result 2:\n${result2}\n`);
  console.log('='.repeat(40));

  // Query 3: Conversational (should route to DirectResponse)
  const query3 = "Hello! Who are you and how do you work?";
  const result3 = await orchestrate(query3);
  console.log(`\n💬 Result 3:\n${result3}\n`);

  logger.printSessionSummary();
}
