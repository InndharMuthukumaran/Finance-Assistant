import 'dotenv/config';
import readline from 'readline';
import { runParallelDemo } from './patterns/parallel.js';
import { runChainingDemo } from './patterns/chaining.js';
import { runErrorRecoveryDemo } from './patterns/errorRecovery.js';
import { runDynamicSelectionDemo } from './patterns/dynamicSelection.js';
import { runCompositionDemo } from './patterns/composition.js';
import { runConditionalDemo } from './patterns/conditional.js';
import { runValidationDemo } from './patterns/validation.js';
import { runLimitsDemo } from './patterns/limits.js';
import { runCostOptimizeDemo } from './patterns/costOptimize.js';
import { runMultiAgentDemo } from './patterns/multiAgent.js';
import { runHumanInLoopDemo } from './patterns/humanInLoop.js';
import { runStreamingDemo } from './patterns/streaming.js';
import { orchestrate } from './agents/orchestrator.js';
import { logger } from './utils/logger.js';

const DEMOS = {
  1: { name: 'Parallel Tool Calling', run: runParallelDemo },
  2: { name: 'Tool Chaining', run: runChainingDemo },
  3: { name: 'Error Recovery', run: runErrorRecoveryDemo },
  4: { name: 'Dynamic Tool Selection', run: runDynamicSelectionDemo },
  5: { name: 'Tool Composition', run: runCompositionDemo },
  6: { name: 'Conditional Tool Calling', run: runConditionalDemo },
  7: { name: 'Tool Input/Output Validation', run: runValidationDemo },
  8: { name: 'Tool Call Limits & Guardrails', run: runLimitsDemo },
  9: { name: 'Cost Optimization (Caching)', run: runCostOptimizeDemo },
  10: { name: 'Multi-Agent Orchestration', run: runMultiAgentDemo },
  11: { name: 'Human-in-the-Loop Approval', run: runHumanInLoopDemo },
  12: { name: 'Streaming Responses', run: runStreamingDemo },
};

function printMenu() {
  console.log('\n\x1b[36m\x1b[1m=== FINANCE ASSISTANT CLI - AGENTIC PATTERNS ===\x1b[0m');
  for (const [key, demo] of Object.entries(DEMOS)) {
    console.log(`  ${key.padStart(2, ' ')}. Run Example ${key.padStart(2, '0')} (${demo.name})`);
  }
  console.log('  13. Interactive Chat Orchestration');
  console.log('  14. Exit');
  console.log('\x1b[36m=================================================\x1b[0m');
}

async function runInteractiveChat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = () => {
    rl.question('\n💬 Enter query (e.g., "calculate 20% of 850", "exit" to quit): ', async (query) => {
      const q = query.trim();
      if (!q) {
        ask();
        return;
      }
      if (q.toLowerCase() === 'exit') {
        rl.close();
        mainMenu();
        return;
      }
      try {
        const response = await orchestrate(q);
        console.log(`\n🤖 Final Agent Response:\n${response}`);
      } catch (err) {
        logger.error(`Error executing orchestrator: ${err.message}`);
      }
      ask();
    });
  };

  logger.info("Chat mode active. Try composite queries like: 'convert 150 EUR to INR and then multiply by 1.15'.");
  ask();
}

function mainMenu() {
  printMenu();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('👉 Select an option (1-14): ', async (choice) => {
    rl.close();
    const selection = choice.trim();

    if (selection === '14') {
      console.log('Goodbye!');
      process.exit(0);
    }

    if (selection === '13') {
      await runInteractiveChat();
      return;
    }

    const demo = DEMOS[selection];
    if (demo) {
      console.log(`\n🚀 Executing Demo: ${demo.name}\n`);
      try {
        await demo.run();
      } catch (err) {
        console.error(`❌ Demo error occurred:`, err);
      }
      
      const waitRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      waitRl.question('\nPress [Enter] to return to main menu...', () => {
        waitRl.close();
        mainMenu();
      });
    } else {
      console.log('Invalid selection. Please choose an option from 1 to 14.');
      mainMenu();
    }
  });
}

// Start CLI
mainMenu();
