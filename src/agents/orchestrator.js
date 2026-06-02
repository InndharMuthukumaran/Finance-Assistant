import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { runCalculatorAgent } from './calculatorAgent.js';
import { runResearchAgent } from './researchAgent.js';
import { logger } from '../utils/logger.js';

/**
 * Orchestrator Agent - routes tasks to specialized sub-agents.
 */
export async function orchestrate(prompt) {
  logger.agentStep('Orchestrator', `Analyzing user query: "${prompt}"`);

  const systemInstruction = `You are the master Orchestrator for a financial assistant.
Your job is to read the user's input and decide which sub-agent is best suited to handle the request.

Sub-agents:
1. "CalculatorAgent": Handles arithmetic calculations, percentage, and tax mathematics.
2. "ResearchAgent": Handles fetching currency conversion rates, logging expenses, reading expense reports, or analyzing budgets.
3. "DirectResponse": Handles greetings, small talk, or simple financial questions that do not require any tools or database logs.

You MUST respond ONLY with a valid JSON block of the following shape:
{
  "agent": "CalculatorAgent" | "ResearchAgent" | "DirectResponse",
  "reason": "Brief explanation for routing decision",
  "refinedQuery": "A clean prompt for the target agent, OR your direct response message if agent is DirectResponse"
}
Ensure the output is valid JSON.`;

  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 500,
    system: systemInstruction,
    messages: [{ role: 'user', content: prompt }]
  });

  logger.trackUsage(response.usage);

  const text = response.content[0].text;
  let decision;
  try {
    const cleanJsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    decision = JSON.parse(cleanJsonText);
  } catch (err) {
    logger.warn(`Failed to parse Orchestrator JSON. Defaulting to ResearchAgent. Raw: ${text}`);
    decision = { agent: 'ResearchAgent', reason: 'Fallback parsing failure', refinedQuery: prompt };
  }

  logger.info(`Decision: route to ${decision.agent} (${decision.reason})`);

  if (decision.agent === 'CalculatorAgent') {
    return await runCalculatorAgent(decision.refinedQuery);
  } else if (decision.agent === 'ResearchAgent') {
    return await runResearchAgent(decision.refinedQuery);
  } else {
    return decision.refinedQuery;
  }
}
