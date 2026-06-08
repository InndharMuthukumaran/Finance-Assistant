import { getModel } from '../utils/gemini.js';
import { executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';
import { currencySchema } from '../tools/currency.js';
import { expenseSchema } from '../tools/expense.js';
import { budgetSchema } from '../tools/budget.js';
import { knowledgeSchema } from '../tools/knowledge.js';

/**
 * Research Agent
 *
 * A specialized sub-agent that handles data lookups and currency operations.
 * It has access to: convert_currency, track_expense, manage_budget, and lookup_financial_knowledge.
 * It does NOT have access to the calculator tool — math is the Calculator Agent's job.
 *
 * This enforces the principle that each agent stays in its own lane.
 * The Orchestrator routes data/research sub-tasks here.
 *
 * @param {string} task - A focused data lookup sub-task delegated by the Orchestrator
 * @returns {Promise<string>} - A plain text result string sent back to the Orchestrator
 */
export async function runResearchAgent(task) {
  logger.agentStep('RESEARCH AGENT', `Received sub-task: "${task}"`);

  // This agent gets data tools and knowledge RAG tool
  const model = getModel([currencySchema, expenseSchema, budgetSchema, knowledgeSchema]);
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: 'You are a specialist research agent for a personal finance assistant. You fetch expense data, check budgets, convert currencies, and look up financial guidelines/rules from the local knowledge base. You do NOT do arithmetic — report raw numbers and let a math specialist handle calculations. Be concise and structured in your responses.' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am a research specialist. I will fetch expenses, budgets, currency data, and financial guidelines using my tools and report raw figures clearly. I will not perform arithmetic calculations.' }]
      }
    ]
  });

  let nextMessage = task;

  // Run up to 4 tool-calling turns to complete the research sub-task
  for (let step = 1; step <= 4; step++) {
    const result = await chat.sendMessage(nextMessage);
    const response = result.response;
    logger.trackUsage(response.usageMetadata);

    const functionCalls = response.functionCalls();

    // No tool calls → agent has a final text answer
    if (!functionCalls || functionCalls.length === 0) {
      const answer = response.text();
      logger.agentStep('RESEARCH AGENT', `Sub-task complete. Result: "${answer}"`);
      return answer;
    }

    // Execute all requested research tool calls
    const toolResponses = await Promise.all(
      functionCalls.map(async (fc) => {
        logger.info(`  🔬 [RESEARCH AGENT] Calling tool: "${fc.name}" with args: ${JSON.stringify(fc.args)}`);
        const toolResult = await executeTool(fc.name, fc.args);
        return {
          functionResponse: {
            name: fc.name,
            response: { result: JSON.stringify(toolResult) }
          }
        };
      })
    );

    // Feed results back into the agent's conversation
    nextMessage = toolResponses;
  }

  return 'Research Agent could not complete the sub-task within the step limit.';
}
