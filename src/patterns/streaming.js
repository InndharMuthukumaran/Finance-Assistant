import { getModel } from '../utils/gemini.js';
import { logger } from '../utils/logger.js';

/**
 * Streaming Pattern
 * Demonstrates real-time response handling and incremental output,
 * simulating streaming behavior by processing content as it becomes available.
 */
export async function runStreamingDemo() {
  const prompt = `Generate a detailed expense analysis for the following transaction:
- Item: Monthly Subscription
- Amount: $14.99 USD
- Category: Software
- Date: 2026-06-04

Provide your response in paragraphs covering:
1. Transaction Summary
2. Budget Impact
3. Annual Cost Projection
4. Recommendations`;

  logger.info(`Starting Streaming Response Demo...`);
  logger.info(`Query: "${prompt.split('\n')[0]}..."`);
  
  console.log(`\n📡 Streaming Response (simulated real-time):\n`);

  const model = getModel([]); // No tools for this demo
  
  const startTime = Date.now();

  try {
    // Send request to Gemini
    const response = await model.generateContent(prompt);
    const result = response.response;
    logger.trackUsage(result.usageMetadata);

    const fullText = result.text();
    
    // Simulate streaming by printing character-by-character with slight delay
    // This demonstrates the concept of real-time output
    const delayMs = 10; // milliseconds between characters
    let displayedChars = 0;

    for (const char of fullText) {
      process.stdout.write(char);
      displayedChars++;
      
      // Add micro-pauses to simulate streaming effect
      if (displayedChars % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log('\n');
    const elapsedMs = Date.now() - startTime;
    logger.info(`✅ Response complete. Display time: ${elapsedMs}ms`);

    console.log(`\n=============================================================`);
    console.log(`📊 Stream Metrics:`);
    console.log(`  Response length: ${fullText.length} characters`);
    console.log(`  Display duration: ${elapsedMs}ms`);
    console.log(`  Characters per second: ${(fullText.length / (elapsedMs / 1000)).toFixed(0)}`);
    console.log(`=============================================================\n`);

  } catch (error) {
    logger.error(`Streaming error: ${error.message}`);
    throw error;
  }

  logger.printSessionSummary();
}
