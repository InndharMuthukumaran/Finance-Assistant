import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { calculatorSchema } from '../tools/calculator.js';
import { executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Calculator Agent - specialized in math and calculations.
 * Has access ONLY to the calculate tool.
 */
export async function runCalculatorAgent(prompt) {
  logger.agentStep('CalculatorAgent', `Processing query: "${prompt}"`);
  
  const messages = [{ role: 'user', content: prompt }];
  
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    system: "You are a specialized math assistant. Use the 'calculate' tool to answer queries accurately. If a calculation is requested, you MUST use the tool.",
    tools: [calculatorSchema],
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
        system: "You are a specialized math assistant. Summarize the result of the calculation.",
        tools: [calculatorSchema],
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
