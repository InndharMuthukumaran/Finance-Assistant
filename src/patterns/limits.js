import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Rate Limiting / Call Limits Pattern
 * Demonstrates handling a burst of tool requests from Gemini while
 * enforcing a concurrency limit (rate limiting) on tool execution.
 */
export async function runLimitsDemo() {
	const prompt = `You are a helpful assistant that should delegate computations to tools.
Please calculate the VAT (20%) for these amounts and call the appropriate tool for each:
- 120.00 EUR
- 45.50 USD
- 999.99 USD
- 12.34 EUR
- 2500 USD
Return results as function calls where each call is the tool name 'calculate' with args { a, operation: 'percentage', b: 20 }`;

	logger.info(`Starting Rate Limit / Call Limits Demo...`);
	logger.info(`Query: "${prompt.split('\n')[0]}..."`);

	const model = getModel(allToolsSchemas);
	const chat = model.startChat();

	const result = await chat.sendMessage(prompt);
	const response = result.response;
	logger.trackUsage(response.usageMetadata);
	const functionCalls = response.functionCalls();

	if (!functionCalls || functionCalls.length === 0) {
		console.log(`\n💬 Gemini's Response:\n${response.text()}\n`);
		logger.printSessionSummary();
		return;
	}

	logger.info(`Gemini requested ${functionCalls.length} tool call(s). Applying concurrency limit...`);

	// Simple concurrency-limited worker
	const concurrency = 2;
	const queue = functionCalls.slice();
	const results = [];

	const worker = async () => {
		while (queue.length > 0) {
			const fc = queue.shift();
			if (!fc) break;
			logger.info(`  → Executing tool (rate-limited) : "${fc.name}"`);
			try {
				const toolResult = await executeTool(fc.name, fc.args);
				results.push({ functionResponse: { name: fc.name, response: { result: JSON.stringify(toolResult) } } });
				logger.toolSuccess(fc.name, toolResult);
			} catch (err) {
				logger.toolError(fc.name, err.message || String(err));
				results.push({ functionResponse: { name: fc.name, response: { error: String(err) } } });
			}
			// brief spacing to simulate respecting rate limits
			await new Promise((res) => setTimeout(res, 50));
		}
	};

	// start N workers
	await Promise.all(Array.from({ length: concurrency }).map(() => worker()));

	logger.info(`Sending ${results.length} tool result(s) back to Gemini...`);
	const finalResult = await chat.sendMessage(results);
	logger.trackUsage(finalResult.response.usageMetadata);

	console.log(`\n💬 Gemini's Final Response:\n${finalResult.response.text()}\n`);

	logger.printSessionSummary();
}
