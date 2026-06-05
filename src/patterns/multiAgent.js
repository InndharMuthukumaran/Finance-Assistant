import { logger } from '../utils/logger.js';
import { runOrchestrator } from '../agents/orchestrator.js';

/**
 * Multi-Agent Tool Calling Pattern
 *
 * This pattern demonstrates how to coordinate multiple specialized AI agents,
 * each with a restricted tool set, under the control of a single Orchestrator.
 *
 * ┌─────────────────── HOW IT WORKS ───────────────────────────────┐
 * │                                                                 │
 * │  User Query                                                     │
 * │      │                                                          │
 * │      ▼                                                          │
 * │  ORCHESTRATOR (Gemini)                                          │
 * │  - Has only "delegate" pseudo-tools                             │
 * │  - Decides which sub-task goes to which agent                   │
 * │  - Synthesizes all sub-results into a final answer              │
 * │      │                         │                                │
 * │      ▼                         ▼                                │
 * │  CALCULATOR AGENT        RESEARCH AGENT                         │
 * │  (Gemini instance)       (Gemini instance)                      │
 * │  Tools: calculate        Tools: convert_currency,               │
 * │                                 track_expense,                  │
 * │                                 manage_budget                   │
 * │      │                         │                                │
 * │      └─────────┬───────────────┘                                │
 * │                ▼                                                 │
 * │       Results fed back to Orchestrator                          │
 * │                ▼                                                 │
 * │        Final Synthesized Answer                                  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * KEY CONCEPT — Delegate Tools:
 * The Orchestrator uses special pseudo-tools (delegate_to_calculator_agent,
 * delegate_to_research_agent) that aren't real finance tools. When Gemini
 * "calls" one of these delegate tools, our JS layer intercepts the call and
 * runs the actual sub-agent function. This is how production frameworks like
 * LangGraph implement agent-to-agent communication.
 *
 * WHY RESTRICT TOOLS PER AGENT?
 * - Prevents agents from doing work outside their specialty
 * - Makes the system more predictable and debuggable
 * - Mirrors real production architectures (e.g., a "billing agent" should
 *   never be able to delete database records)
 */

export async function runMultiAgentDemo() {
  console.log('\n' + '🌐 '.repeat(35));
  console.log('  MULTI-AGENT TOOL CALLING DEMO');
  console.log('  Pattern: Orchestrator + Specialized Sub-Agents');
  console.log('🌐 '.repeat(35) + '\n');

  logger.info('Starting Multi-Agent Tool Calling Demo...');

  // ─── Demo Query ───────────────────────────────────────────────────────────
  // This query requires both agents:
  //   1. Research Agent  → fetch total expenses + convert to EUR
  //   2. Calculator Agent → compute 25% savings on the total
  const userQuery =
    'I need a complete financial report. ' +
    'First, get my total spending across all expense categories. ' +
    'Then convert that total amount from USD to EUR. ' +
    'Finally, calculate how much I would save if I cut my total spending by 25%. ' +
    'Provide a clear summary at the end.';

  console.log('📋 User Query:');
  console.log(`   "${userQuery}"`);
  console.log();

  try {
    // Hand the query to the Orchestrator — it takes care of everything from here
    await runOrchestrator(userQuery);
  } catch (error) {
    logger.error(`Multi-Agent Demo failed: ${error.message}`);
    console.error(`\n❌ Fatal Error: ${error.message}\n`);
  }

  logger.printSessionSummary();
}
