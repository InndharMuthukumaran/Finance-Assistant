import readline from 'readline';
import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Helper utility to ask a question in the terminal and wait for human response.
 */
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

/**
 * Human-in-the-Loop (HITL) Pattern Demo
 * 
 * Classifies tool calls as Safe or Sensitive.
 * Safe tools run autonomously. Sensitive tools prompt the human for:
 *  - [y] Approve: Execute tool normally.
 *  - [n] Deny: Block execution and return rejection back to Gemini.
 *  - [m] Modify: Override parameters (e.g. amount) before executing.
 */
export async function runHumanInLoopDemo() {
  logger.info("Starting Human-In-The-Loop (HITL) Gatekeeper Demo...");

  const prompt = "Please log a new expense of $500 for a PlayStation 5.";
  console.log(`\n📝 User Request: "${prompt}"`);

  const model = getModel(allToolsSchemas);
  const chat = model.startChat();

  let nextMessage = prompt;
  let step = 1;

  while (step <= 3) {
    logger.info(`Sending message to Gemini (Turn ${step})...`);
    const result = await chat.sendMessage(nextMessage);
    const response = result.response;
    logger.trackUsage(response.usageMetadata);
    
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      console.log(`\n💬 Gemini's Response:\n${response.text()}\n`);
      break;
    }

    const toolResponses = [];
    for (const fc of functionCalls) {
      logger.info(`Gemini requested tool: "${fc.name}"`);
      console.log(`   Arguments: ${JSON.stringify(fc.args)}`);

      // 1. Classification: Only 'track_expense' + 'add' action is considered sensitive
      const isSensitive = fc.name === 'track_expense' && fc.args.action === 'add';

      if (isSensitive) {
        console.log(`\n⚠️  [GATEKEEPER] A sensitive action requires your approval:`);
        console.log(`👉 Proposal: Log expense of $${fc.args.amount} for "${fc.args.category}" (${fc.args.description || 'No description'})`);
        
        const answer = await askQuestion("Do you approve this action? [y]es / [n]o / [m]odify: ");
        const choice = answer.toLowerCase().trim();

        if (choice === 'y' || choice === 'yes') {
          logger.info("✓ Action Approved by user. Executing tool...");
          const toolResult = await executeTool(fc.name, fc.args);
          toolResponses.push({ 
            functionResponse: { 
              name: fc.name, 
              response: { result: JSON.stringify(toolResult) } 
            } 
          });
        } 
        else if (choice === 'm' || choice === 'modify') {
          const newAmountInput = await askQuestion("Enter modified amount (number): ");
          const parsedAmount = Number(newAmountInput);
          
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            logger.error("Invalid amount entered. Blocking execution.");
            toolResponses.push({ 
              functionResponse: { 
                name: fc.name, 
                response: { error: "User attempted to modify amount but provided an invalid number." } 
              } 
            });
          } else {
            fc.args.amount = parsedAmount;
            logger.info(`✓ Action Modified. Executing tool with new amount: $${fc.args.amount}...`);
            const toolResult = await executeTool(fc.name, fc.args);
            toolResponses.push({ 
              functionResponse: { 
                name: fc.name, 
                response: { result: JSON.stringify(toolResult) } 
              } 
            });
          }
        } 
        else {
          logger.warn("❌ Action Denied by user. Blocking execution.");
          toolResponses.push({ 
            functionResponse: { 
              name: fc.name, 
              response: { error: "User rejected this tool execution. Do not log the expense." } 
            } 
          });
        }
      } else {
        // Safe tool, execute without prompting the human
        logger.info(`✓ [Safe Tool] Running "${fc.name}" autonomously.`);
        const toolResult = await executeTool(fc.name, fc.args);
        toolResponses.push({ 
          functionResponse: { 
            name: fc.name, 
            response: { result: JSON.stringify(toolResult) } 
          } 
        });
      }
    }

    nextMessage = toolResponses;
    step++;
  }

  logger.printSessionSummary();
}
