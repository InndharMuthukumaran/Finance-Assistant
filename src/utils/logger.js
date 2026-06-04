import chalk from 'chalk';
import config from './config.js';

/**
 * Log Levels (from least to most severe):
 * - debug   (0): Detailed diagnostic info (token counts, internal calls)
 * - info    (1): Standard operational messages (what's happening now)
 * - warn    (2): Warnings (something unusual, but app continues)
 * - error   (3): Errors (something failed)
 * 
 * Filtering: Only logs >= current level are shown.
 * Example: if level=info(1), shows info + warn + error (not debug)
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[config.logLevel] !== undefined ? LOG_LEVELS[config.logLevel] : LOG_LEVELS.info;
    this.totalCost = 0;
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
  }

  debug(msg, ...args) {
    if (this.level <= LOG_LEVELS.debug) {
      console.log(chalk.dim(`[DEBUG] ${msg}`), ...args);
    }
  }

  info(msg, ...args) {
    if (this.level <= LOG_LEVELS.info) {
      console.log(chalk.cyan(`[INFO]`) + ` ${msg}`, ...args);
    }
  }

  warn(msg, ...args) {
    if (this.level <= LOG_LEVELS.warn) {
      console.warn(chalk.yellow(`[WARN] ⚠️`) + ` ${msg}`, ...args);
    }
  }

  error(msg, ...args) {
    if (this.level <= LOG_LEVELS.error) {
      console.error(chalk.red(`[ERROR] ❌`) + ` ${msg}`, ...args);
    }
  }

  // Visual highlights for agent steps
  agentStep(agentName, message) {
    console.log(`\n🤖 ${chalk.bold.magenta(`[${agentName}]`)} ${message}`);
  }

  toolCall(toolName, params) {
    console.log(`🔌 ${chalk.blue(`[TOOL_CALL]`)} Executing ${chalk.bold(toolName)} with params:`, JSON.stringify(params));
  }

  toolSuccess(toolName, result) {
    console.log(`✅ ${chalk.green(`[TOOL_SUCCESS]`)} ${toolName} returned:`, JSON.stringify(result));
  }
  toolError(toolName, errorMsg) {
    console.log(`❌ ${chalk.red(`[TOOL_ERROR]`)} ${toolName} failed: ${errorMsg}`);
  }

  // Token & Cost Tracking for Gemini API
  // Gemini pricing: $3 per 1M input tokens, $15 per 1M output tokens
  trackUsage(usage) {
    if (!usage) return;

    // Gemini API returns: promptTokenCount, candidatesTokenCount, totalTokenCount
    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;

    // Calculate cost
    const inputCost = (inputTokens / 1_000_000) * 3.0;
    const outputCost = (outputTokens / 1_000_000) * 15.0;
    const cost = inputCost + outputCost;

    // Accumulate session totals
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
    this.totalCost += cost;

    // Log if we tracked any tokens
    if (inputTokens || outputTokens) {
      const total = inputTokens + outputTokens;
      this.debug(`Usage tracked: In=${inputTokens}, Out=${outputTokens}, Total=${total}, Cost=$${cost.toFixed(6)}`);
    }
  }

  printSessionSummary() {
    console.log('\n' + '='.repeat(50));
    console.log(chalk.bold.green('📊 SESSION METRICS SUMMARY'));
    console.log(`  Total Input Tokens:  ${this.totalInputTokens}`);
    console.log(`  Total Output Tokens: ${this.totalOutputTokens}`);
    console.log(`  Total Token Count:   ${this.totalInputTokens + this.totalOutputTokens}`);
    console.log(`  Estimated Cost USD:  $${this.totalCost.toFixed(6)}`);
    console.log('='.repeat(50) + '\n');
  }
}

export const logger = new Logger();
