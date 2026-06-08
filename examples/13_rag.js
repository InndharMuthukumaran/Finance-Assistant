import 'dotenv/config';
import { buildKnowledgeIndex, queryKnowledgeBase } from '../src/utils/ragBridge.js';
import { runOrchestrator } from '../src/agents/orchestrator.js';
import { logger } from '../src/utils/logger.js';
import chalk from 'chalk';

async function runRAGDemo() {
  console.clear();
  console.log(chalk.bold.cyan('===================================================='));
  console.log(chalk.bold.cyan('   DEMO: Hybrid Python + Node.js RAG Assistant      '));
  console.log(chalk.bold.cyan('====================================================\n'));

  // Step 1: Initialize / Index Vector Database
  console.log(chalk.yellow('Step 1: Building local FAISS Vector Index...'));
  console.log(chalk.dim('(This will chunk the financial guide, generate local embeddings, and save the FAISS binary)'));
  
  try {
    const buildResult = await buildKnowledgeIndex();
    console.log(chalk.green('✓ Vector Index successfully built!'));
    console.log(chalk.dim(buildResult));
  } catch (error) {
    console.error(chalk.red('✗ Failed to build vector index:'), error.message);
    process.exit(1);
  }

  console.log('\n' + chalk.yellow('Step 2: Testing raw vector similarity search...'));
  const testQuery = "What is the 50/30/20 rule and how does it split income?";
  console.log(chalk.blue(`Querying: "${testQuery}"`));
  
  try {
    const searchResults = await queryKnowledgeBase(testQuery, 2);
    console.log(chalk.green('✓ Semantic search results:'));
    searchResults.forEach((res, i) => {
      console.log(chalk.bold(`  [Result #${i + 1}] Similarity Score: ${res.score.toFixed(4)}`));
      console.log(chalk.dim(`  Text: ${res.text}\n`));
    });
  } catch (error) {
    console.error(chalk.red('✗ Failed similarity search:'), error.message);
    process.exit(1);
  }

  // Step 3: Run Orchestrator with RAG grounding
  console.log(chalk.yellow('Step 3: Running Orchestrator Agent with RAG grounding...'));
  const userQuery = "Explain the 50/30/20 budget rule and calculate the Needs, Wants, and Savings amounts for an income of 4500 USD.";
  console.log(chalk.blue(`User Query: "${userQuery}"`));
  
  try {
    await runOrchestrator(userQuery);
  } catch (error) {
    console.error(chalk.red('✗ Orchestration failed:'), error.message);
  }

  logger.printSessionSummary();
}

runRAGDemo().catch(err => {
  console.error('Fatal error in RAG Demo:', err);
  process.exit(1);
});
