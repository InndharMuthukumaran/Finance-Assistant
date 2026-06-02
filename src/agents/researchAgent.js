import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { currencySchema } from '../tools/currency.js';
import { expenseSchemas } from '../tools/expense.js';
import { budgetSchema } from '../tools/budget.js';
import { executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

const researchTools = [
  currencySchema,
  ...expenseSchemas,
  budgetSchema
];

/**
 * Research Agent - specialized in database logs, exchange rates, and budgets.
 * Has access to currency, expense logging, and budget analysis tools.
 */
export async function runResearchAgent(prompt) {
  logger.agentStep('ResearchAgent', `Processing query: "${prompt}"`);
  
  const messages = [{ role: 'user', content: prompt }];
  
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    system: "You are a specialized financial researcher and database agent. Use the correct tools to get live currency conversion rates, manage the expense ledger, or run budget analyses.",
    tools: researchTools,
    messages
  });

  logger.trackUsage(response.usage);

  if (response.stop_reason === 'tool_use') {
    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (toolUse) {
      const result = await executeTool(toolUse.name, toolUse.input);
      
      const followUp = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: "You are a specialized financial researcher and database agent. Present the results of the tool action clearly to the user.",
        tools: researchTools,
        messages: [
          ...messages,
          { role: 'assistant', content: response.content },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify(result)
              }
            ]
          }
        ]
      });

      logger.trackUsage(followUp.usage);
      return followUp.content[0].text;
    }
  }

  return response.content[0].text;
}
