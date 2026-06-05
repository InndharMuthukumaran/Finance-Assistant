import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';
import { toolCache } from '../utils/cache.js';

/**
 * Process a single message turn in the conversation, handling tool execution with cache support.
 */
async function processQueryWithCaching(chat, query) {
  const result = await chat.sendMessage(query);
  const response = result.response;
  logger.trackUsage(response.usageMetadata);
  
  const functionCalls = response.functionCalls();
  if (!functionCalls || functionCalls.length === 0) {
    console.log(`\n💬 Gemini's Response:\n${response.text()}\n`);
    return;
  }

  logger.info(`Gemini requested ${functionCalls.length} tool call(s).`);
  
  const toolResponses = [];
  for (const fc of functionCalls) {
    try {
      // Execute the tool with caching enabled
      const r = await executeTool(fc.name, fc.args, { useCache: true });
      toolResponses.push({ 
        functionResponse: { 
          name: fc.name, 
          response: { result: JSON.stringify(r) } 
        } 
      });
    } catch (e) {
      toolResponses.push({ 
        functionResponse: { 
          name: fc.name, 
          response: { error: e.message || String(e) } 
        } 
      });
    }
  }

  const finalResult = await chat.sendMessage(toolResponses);
  logger.trackUsage(finalResult.response.usageMetadata);
  console.log(`\n💬 Gemini's Final Response:\n${finalResult.response.text()}\n`);
}

/**
 * Cost Optimization Pattern Demo (Tool Call Caching)
 * 
 * Demonstrates how to cache tool calling data using `cache.js` to avoid
 * redundant calls to external APIs or heavy computations, reducing costs and latency.
 */
export async function runCostOptimizeDemo() {
  logger.info(`Starting Cost Optimization (Tool Call Caching) Demo...`);
  
  // Clear any pre-existing cache entries to start fresh
  toolCache.clear();
  
  let metrics = toolCache.getMetrics();
  console.log(`\n🔋 Cache Stats initially: size=${metrics.size}, hits=${metrics.hits}, misses=${metrics.misses}\n`);

  const model = getModel(allToolsSchemas);

  // --- Session 1 ---
  logger.info(`--- Starting Chat Session 1 (Fresh Cache) ---`);
  const chat1 = model.startChat();
  const query1 = "I have expenses of $120 for coffee and $45 for streaming. Can you add them? Also, please convert $210 USD to EUR so I can compare it.";
  logger.info(`Sending Request 1: "${query1}"`);
  
  await processQueryWithCaching(chat1, query1);

  metrics = toolCache.getMetrics();
  console.log(`\n🔋 Cache Stats after Request 1: size=${metrics.size}, hits=${metrics.hits}, misses=${metrics.misses}\n`);

  // --- Session 2 ---
  logger.info(`--- Starting Chat Session 2 (New Session, Reusing Cache) ---`);
  // Using a new chat session so the LLM doesn't have the answers in history and is forced to call the tools again.
  const chat2 = model.startChat();
  const query2 = "Can you check what is $120 plus $45? Also, I need to know how much is $210 USD in EUR. Please provide both answers.";
  logger.info(`Sending Request 2 (Identical/Similar calculations): "${query2}"`);
  
  await processQueryWithCaching(chat2, query2);

  metrics = toolCache.getMetrics();
  console.log(`\n🔋 Final Cache Stats: size=${metrics.size}, hits=${metrics.hits}, misses=${metrics.misses}`);
  console.log(`💡 Saved ${metrics.hits} external tool execution(s) via cache!`);
  
  logger.printSessionSummary();
}
