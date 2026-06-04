import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Cost Optimization Pattern
 * Demonstrates making decisions to reduce model usage/costs by
 * preferring local tools or concise follow-ups when a cost threshold
 * is exceeded.
 */
export async function runCostOptimizeDemo() {
	const prompt = `You are a budget-savvy assistant. Given these monthly expenses, provide 3 short recommendations to reduce costs.
- Coffee: $120
- Streaming: $45
- Cloud hosting: $210
- Subscriptions: $30
If you need to compute totals, prefer calling local tools but keep output concise.`;

	logger.info(`Starting Cost Optimization Demo...`);
	logger.info(`Query: "${prompt.split('\n')[0]}..."`);

	const model = getModel(allToolsSchemas);
	const chat = model.startChat();

	const result = await chat.sendMessage(prompt);
	const response = result.response;
	logger.trackUsage(response.usageMetadata);

	// Compute immediate request cost from usageMetadata
	const usage = response.usageMetadata || {};
	const parse = (v) => (typeof v === 'number' ? v : Number(v) || 0);
	const promptTokens = parse(usage.promptTokenCount ?? usage.prompt_tokens ?? usage.promptTokens);
	const candidateTokens = parse(usage.candidatesTokenCount ?? usage.candidates_tokens ?? usage.candidateTokens);
	const derivedInput = promptTokens;
	const derivedOutput = candidateTokens;
	const inputCost = (derivedInput / 1_000_000) * 3.0;
	const outputCost = (derivedOutput / 1_000_000) * 15.0;
	const immediateCost = inputCost + outputCost;

	logger.debug(`Immediate estimated cost: $${immediateCost.toFixed(6)}`);

	const COST_THRESHOLD = 0.0005; // demo threshold

	const functionCalls = response.functionCalls();
	if (!functionCalls || functionCalls.length === 0) {
		console.log(`\n💬 Gemini's Response:\n${response.text()}\n`);
		logger.printSessionSummary();
		return;
	}

	// If cost is high, avoid another model roundtrip: resolve locally and summarize.
	if (immediateCost > COST_THRESHOLD) {
		logger.warn(`Estimated cost ${immediateCost.toFixed(6)} exceeds threshold; resolving locally.`);
		const localResults = [];
		for (const fc of functionCalls) {
			try {
				const r = await executeTool(fc.name, fc.args);
				localResults.push({ name: fc.name, result: r });
				logger.toolSuccess(fc.name, r);
			} catch (e) {
				logger.toolError(fc.name, e.message || String(e));
			}
		}

		// Summarize locally without asking Gemini again
		console.log('\n💬 Cost-Optimized Summary (local):');
		console.log(localResults.map((x) => `${x.name}: ${JSON.stringify(x.result)}`).join('\n'));
		logger.printSessionSummary();
		return;
	}

	// Otherwise, execute tools and send results back to Gemini for a final polished answer
	logger.info(`Executing ${functionCalls.length} tool call(s) and returning concise answer.`);
	const toolResponses = [];
	for (const fc of functionCalls) {
		try {
			const r = await executeTool(fc.name, fc.args);
			toolResponses.push({ functionResponse: { name: fc.name, response: { result: JSON.stringify(r) } } });
			logger.toolSuccess(fc.name, r);
		} catch (e) {
			logger.toolError(fc.name, e.message || String(e));
			toolResponses.push({ functionResponse: { name: fc.name, response: { error: String(e) } } });
		}
	}

	const finalResult = await chat.sendMessage(toolResponses);
	logger.trackUsage(finalResult.response.usageMetadata);
	console.log(`\n💬 Gemini's Final Response:\n${finalResult.response.text()}\n`);
	logger.printSessionSummary();
}
