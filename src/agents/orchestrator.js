import { getModel } from '../utils/gemini.js';
import { logger } from '../utils/logger.js';
import { runCalculatorAgent } from './calculatorAgent.js';
import { runResearchAgent } from './researchAgent.js';

/**
 * Orchestrator Agent
 *
 * The top-level agent that receives a complex user query and breaks it into
 * focused sub-tasks, routing each to the appropriate specialist agent.
 *
 * KEY CONCEPT — "Delegate Tools":
 * The Orchestrator does not have any finance tools (calculate, convert, etc.)
 * Instead, it is given two special pseudo-tools:
 *   - delegate_to_calculator_agent: routes math sub-tasks
 *   - delegate_to_research_agent: routes data lookup sub-tasks
 *
 * When Gemini calls one of these delegate tools, our JS code intercepts that
 * tool call and actually runs the sub-agent function. The sub-agent's result
 * is then fed back to the Orchestrator as a tool response, so the Orchestrator
 * can use it in further reasoning or final synthesis.
 *
 * This is exactly how frameworks like LangGraph implement agent routing — the
 * LLM doesn't talk to other LLMs directly; it makes a tool call that the
 * framework intercepts and dispatches.
 */

// ─── Delegate Tool Schemas ────────────────────────────────────────────────────
// These are NOT real finance tools. They are routing instructions the
// Orchestrator uses to hand off work to sub-agents.

const delegateToCalculatorSchema = {
  name: 'delegate_to_calculator_agent',
  description:
    'Delegate a math or arithmetic sub-task to the Calculator Agent. ' +
    'Use this for: addition, subtraction, multiplication, division, percentage calculations. ' +
    'Pass a clear, self-contained task description with all numbers included. ' +
    'The Calculator Agent will return the result as text.',
  input_schema: {
    type: 'object',
    properties: {
      task: {
        type: 'string',
        description:
          'A self-contained math task, e.g. "Calculate 25% of 115.75 USD" or "What is 500 + 300 - 45.50?"'
      }
    },
    required: ['task']
  }
};

const delegateToResearchSchema = {
  name: 'delegate_to_research_agent',
  description:
    'Delegate a data lookup, currency conversion, or financial knowledge query to the Research Agent. ' +
    'Use this for: fetching expense totals, checking budgets, converting currencies, or looking up reference rules (like 50/30/20 budget or emergency funds). ' +
    'Pass a clear, self-contained task description. ' +
    'The Research Agent will return raw data as text — do not ask it to do arithmetic.',
  input_schema: {
    type: 'object',
    properties: {
      task: {
        type: 'string',
        description:
          'A self-contained research task, e.g. "Fetch total expenses across all categories", "Convert 115.75 USD to EUR", or "Find what the 50/30/20 rule is"'
      }
    },
    required: ['task']
  }
};

// ─── Delegate Tool Dispatcher ─────────────────────────────────────────────────
// Maps each delegate tool name to its actual sub-agent function.
// This is the bridge between the Orchestrator's tool calls and real sub-agents.

async function dispatchDelegate(toolName, args) {
  switch (toolName) {
    case 'delegate_to_calculator_agent':
      return await runCalculatorAgent(args.task);

    case 'delegate_to_research_agent':
      return await runResearchAgent(args.task);

    default:
      throw new Error(`Orchestrator: Unknown delegate tool: "${toolName}"`);
  }
}

// ─── Orchestrator Entry Point ─────────────────────────────────────────────────

/**
 * Runs the Orchestrator Agent with the given user query.
 * The Orchestrator will route sub-tasks to specialist agents and synthesize results.
 *
 * @param {string} userQuery - The complex user query requiring multi-agent coordination
 */
export async function runOrchestrator(userQuery) {
  logger.agentStep('ORCHESTRATOR', `Received query: "${userQuery}"`);
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🎭 ORCHESTRATOR starting. Will delegate to specialist agents as needed.`);
  console.log(`${'═'.repeat(70)}\n`);

  // The Orchestrator only knows about delegate tools, not the raw finance tools
  const model = getModel([delegateToCalculatorSchema, delegateToResearchSchema]);

  const systemInstruction =
    'You are an Orchestrator AI for a personal finance assistant. ' +
    'Your job is to ONLY coordinate and delegate — you do NOT answer directly. ' +
    'Break the user query into sub-tasks and call the appropriate delegate tools:\n' +
    '  • delegate_to_research_agent — for data lookups (expenses, budgets, currency conversion, looking up financial guidelines/reference rules)\n' +
    '  • delegate_to_calculator_agent — for math operations (percentages, totals, savings)\n' +
    'After receiving all sub-task results, synthesize a clear final answer for the user. ' +
    'Always delegate first; never answer without using tools.';

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: systemInstruction }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am the Orchestrator. I will break complex queries into sub-tasks and delegate them to the appropriate specialist agents before synthesizing a final answer.' }]
      }
    ]
  });

  let nextMessage = userQuery;

  // The Orchestrator loop — runs until it has a final text answer or hits the step limit
  for (let step = 1; step <= 6; step++) {
    logger.agentStep('ORCHESTRATOR', `Turn ${step} — sending message to Gemini...`);

    const result = await chat.sendMessage(nextMessage);
    const response = result.response;
    logger.trackUsage(response.usageMetadata);

    const functionCalls = response.functionCalls();

    // No tool calls → Orchestrator has synthesized the final answer
    if (!functionCalls || functionCalls.length === 0) {
      const finalAnswer = response.text();
      console.log(`\n${'═'.repeat(70)}`);
      console.log(`💬 ORCHESTRATOR Final Synthesized Answer:`);
      console.log(`${'═'.repeat(70)}`);
      console.log(finalAnswer);
      console.log(`${'═'.repeat(70)}\n`);
      return;
    }

    // Process each delegate tool call by running the actual sub-agent
    const toolResponses = [];

    for (const fc of functionCalls) {
      console.log(`\n${'─'.repeat(70)}`);
      logger.agentStep('ORCHESTRATOR', `Delegating → calling tool: "${fc.name}"`);
      logger.info(`  Sub-task: "${fc.args.task}"`);
      console.log(`${'─'.repeat(70)}`);

      try {
        // This is where the magic happens: the Orchestrator's tool call
        // is intercepted and dispatched to an actual sub-agent function
        const subAgentResult = await dispatchDelegate(fc.name, fc.args);

        console.log(`\n${'─'.repeat(70)}`);
        logger.agentStep('ORCHESTRATOR', `Result received from "${fc.name}"`);
        logger.info(`  Sub-agent returned: "${subAgentResult}"`);
        console.log(`${'─'.repeat(70)}\n`);

        toolResponses.push({
          functionResponse: {
            name: fc.name,
            response: { result: subAgentResult }
          }
        });
      } catch (error) {
        logger.error(`Delegate tool "${fc.name}" failed: ${error.message}`);
        toolResponses.push({
          functionResponse: {
            name: fc.name,
            response: { error: error.message }
          }
        });
      }
    }

    // Feed all sub-agent results back to the Orchestrator for the next turn
    nextMessage = toolResponses;
  }

  logger.warn('Orchestrator reached step limit without a final text response.');
}
