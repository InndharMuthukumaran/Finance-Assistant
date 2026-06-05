import { getModel } from '../utils/gemini.js';
import { executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';
import { calculatorSchema } from '../tools/calculator.js';

/**
 * Calculator Agent
 *
 * A specialized sub-agent that handles ONLY math and percentage operations.
 * It is intentionally given a restricted tool set (just `calculate`) to enforce
 * the principle of least privilege — an agent should only have access to the
 * tools it actually needs for its job.
 *
 * Called by the Orchestrator when a math-heavy sub-task needs to be solved.
 *
 * @param {string} task - A focused math sub-task delegated by the Orchestrator
 * @returns {Promise<string>} - A plain text result string sent back to the Orchestrator
 */
export async function runCalculatorAgent(task) {
  logger.agentStep('CALCULATOR AGENT', `Received sub-task: "${task}"`);

  // This agent only gets the calculator tool — nothing else.
  const model = getModel([calculatorSchema]);
  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: 'You are a specialist math agent. You only perform arithmetic and percentage calculations using the tools available to you. Answer concisely with the numeric result and a brief explanation.' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am a math specialist. I will use the calculate tool to solve arithmetic and percentage problems and return clear, concise results.' }]
      }
    ]
  });

  let nextMessage = task;

  // Run up to 3 tool-calling turns to solve the sub-task
  for (let step = 1; step <= 3; step++) {
    const result = await chat.sendMessage(nextMessage);
    const response = result.response;
    logger.trackUsage(response.usageMetadata);

    const functionCalls = response.functionCalls();

    // No tool calls → agent has a final text answer
    if (!functionCalls || functionCalls.length === 0) {
      const answer = response.text();
      logger.agentStep('CALCULATOR AGENT', `Sub-task complete. Result: "${answer}"`);
      return answer;
    }

    // Execute all requested calculator tool calls
    const toolResponses = await Promise.all(
      functionCalls.map(async (fc) => {
        logger.info(`  🧮 [CALCULATOR AGENT] Calling tool: "${fc.name}" with args: ${JSON.stringify(fc.args)}`);
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

  // Fallback if agent never produced a text response within step limit
  return 'Calculator Agent could not complete the sub-task within the step limit.';
}
