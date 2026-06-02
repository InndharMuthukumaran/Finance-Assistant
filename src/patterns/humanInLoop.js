import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';
import readline from 'readline';

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const ans = answer.trim().toLowerCase();
      resolve(ans === 'y' || ans === 'yes');
    });
  });
}

/**
 * Human-in-the-Loop Pattern:
 * Intercepts high-risk or mutations (like add_expense or delete_expense)
 * and requests manual console-based confirmation from the user before executing.
 */
export async function runHumanInLoopDemo() {
  const prompt = "Track a business expense of $1200 for a new iPad Pro.";
  logger.info(`Starting Human-in-the-Loop Demo...`);
  logger.info(`Query: "${prompt}"`);

  let messages = [{ role: 'user', content: prompt }];
  let step = 1;

  while (step < 5) {
    logger.info(`Step ${step} - Requesting action from Claude...`);
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      tools: allToolsSchemas,
      messages
    });

    logger.trackUsage(response.usage);

    if (response.stop_reason !== 'tool_use') {
      console.log(`\n💬 Claude's Final Response:\n${response.content[0].text}\n`);
      break;
    }

    const toolCall = response.content.find(b => b.type === 'tool_use');
    if (!toolCall) {
      break;
    }

    let approved = true;
    let result;

    // Trigger confirmation prompt if attempting to log an expense
    if (toolCall.name === 'add_expense') {
      const details = toolCall.input;
      console.log(`\n⚠️  \x1b[33m\x1b[1m[HUMAN APPROVAL REQUIRED]\x1b[0m`);
      console.log(`   Requesting permission to add expense to database:`);
      console.log(`   - Item:   "${details.description}"`);
      console.log(`   - Amount: ${details.amount} ${details.currency || 'USD'}`);
      
      approved = await askConfirmation(`👉 Do you want to log this expense? (y/N): `);
    }

    if (approved) {
      logger.info(`Action APPROVED. Executing tool...`);
      result = await executeTool(toolCall.name, toolCall.input);
    } else {
      logger.warn(`Action DENIED by human operator. Aborting execution.`);
      result = { error: "Security Exception: User denied execution permission." };
    }

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: JSON.stringify(result),
          is_error: !approved
        }
      ]
    });

    step++;
  }

  logger.printSessionSummary();
}
