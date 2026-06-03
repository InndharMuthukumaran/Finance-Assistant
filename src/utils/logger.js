import config from './config.js';

// ANSI terminal color codes for premium visual logging
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  fgRed: '\x1b[31m',
  fgGreen: '\x1b[32m',
  fgYellow: '\x1b[33m',
  fgBlue: '\x1b[34m',
  fgMagenta: '\x1b[35m',
  fgCyan: '\x1b[36m',
  bgBlue: '\x1b[44m',
};

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
      console.log(`${COLORS.dim}[DEBUG] ${msg}${COLORS.reset}`, ...args);
    }
  }

  info(msg, ...args) {
    if (this.level <= LOG_LEVELS.info) {
      console.log(`${COLORS.fgCyan}[INFO]${COLORS.reset} ${msg}`, ...args);
    }
  }

  warn(msg, ...args) {
    if (this.level <= LOG_LEVELS.warn) {
      console.warn(`${COLORS.fgYellow}[WARN] ⚠️ ${msg}${COLORS.reset}`, ...args);
    }
  }

  error(msg, ...args) {
    if (this.level <= LOG_LEVELS.error) {
      console.error(`${COLORS.fgRed}[ERROR] ❌ ${msg}${COLORS.reset}`, ...args);
    }
  }

  // Visual highlights for agent steps
  agentStep(agentName, message) {
    console.log(`\n🤖 ${COLORS.bright}${COLORS.fgMagenta}[${agentName}]${COLORS.reset} ${message}`);
  }

  toolCall(toolName, params) {
    console.log(`🔌 ${COLORS.fgBlue}[TOOL_CALL]${COLORS.reset} Executing ${COLORS.bright}${toolName}${COLORS.reset} with params:`, JSON.stringify(params));
  }

  toolSuccess(toolName, result) {
    console.log(`✅ ${COLORS.fgGreen}[TOOL_SUCCESS]${COLORS.reset} ${toolName} returned:`, JSON.stringify(result));
  }

  // Backwards-compatible alias used elsewhere in the codebase
  toolResult(toolName, result) {
    this.toolSuccess(toolName, result);
  }

  toolError(toolName, errorMsg) {
    console.log(`❌ ${COLORS.fgRed}[TOOL_ERROR]${COLORS.reset} ${toolName} failed: ${errorMsg}`);
  }

  // Token & Cost Tracking (approximate; adjust per model/provider pricing)
  trackUsage(usage) {
    if (!usage) return;

    const parseTokenValue = (value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return Number(value) || 0;
      return 0;
    };

    const promptTokens = parseTokenValue(
      usage.promptTokenCount ?? usage.prompt_tokens ?? usage.promptTokens ?? usage.prompt_token_count
    );
    const candidateTokens = parseTokenValue(
      usage.candidatesTokenCount ?? usage.candidates_tokens ?? usage.candidateTokens ?? usage.candidates_token_count
    );
    const inputTokens = parseTokenValue(
      usage.input_tokens ?? usage.inputTokens ?? usage.input_tokens_total ?? usage.inputTokensTotal
    );
    const outputTokens = parseTokenValue(
      usage.output_tokens ?? usage.outputTokens ?? usage.output_tokens_total ?? usage.outputTokensTotal
    );
    const totalTokens = parseTokenValue(
      usage.totalTokenCount ?? usage.total_tokens ?? usage.totalTokens ?? usage.total_token_count
    );

    const derivedInputTokens = inputTokens || promptTokens;
    const derivedOutputTokens = outputTokens || candidateTokens;
    const derivedTotalTokens = totalTokens || derivedInputTokens + derivedOutputTokens;

    const inputCost = (derivedInputTokens / 1_000_000) * 3.0;
    const outputCost = (derivedOutputTokens / 1_000_000) * 15.0;
    const cost = inputCost + outputCost;

    this.totalInputTokens += derivedInputTokens;
    this.totalOutputTokens += derivedOutputTokens;
    this.totalCost += cost;

    if (derivedInputTokens || derivedOutputTokens || derivedTotalTokens) {
      this.debug(
        `Usage tracked: In=${derivedInputTokens}, Out=${derivedOutputTokens}, Total=${derivedTotalTokens}, Cost=$${cost.toFixed(6)}`
      );
    }
  }

  printSessionSummary() {
    console.log('\n' + '='.repeat(50));
    console.log(`${COLORS.bright}${COLORS.fgGreen}📊 SESSION METRICS SUMMARY${COLORS.reset}`);
    console.log(`  Total Input Tokens:  ${this.totalInputTokens}`);
    console.log(`  Total Output Tokens: ${this.totalOutputTokens}`);
    console.log(`  Total Token Count:   ${this.totalInputTokens + this.totalOutputTokens}`);
    console.log(`  Estimated Cost USD:  $${this.totalCost.toFixed(6)}`);
    console.log('='.repeat(50) + '\n');
  }
}

export const logger = new Logger();
