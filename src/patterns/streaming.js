import { anthropic, DEFAULT_MODEL } from '../utils/anthropic.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Streaming Tool Responses Pattern:
 * Reads Claude's response chunk-by-chunk using a stream iterator.
 * We parse text updates and tool JSON arguments progressively as they arrive,
 * executing tools and returning outputs to complete the assistant stream.
 */
export async function runStreamingDemo() {
  const prompt = "Please convert 350 EUR to INR and then calculate what 20% of that converted rate is.";
  logger.info(`Starting Streaming Response Demo...`);
  logger.info(`Query: "${prompt}"`);

  let messages = [{ role: 'user', content: prompt }];
  let step = 1;

  while (step < 4) {
    logger.info(`Step ${step} - Opening stream...`);
    
    let accumulatedText = "";
    let accumulatedToolUse = null;
    let partialJson = "";

    const stream = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      tools: allToolsSchemas,
      messages,
      stream: true
    });

    for await (const chunk of stream) {
      // Chunk start detects tool initialization
      if (chunk.type === 'content_block_start') {
        const block = chunk.content_block;
        if (block.type === 'tool_use') {
          accumulatedToolUse = {
            id: block.id,
            name: block.name,
            input: {}
          };
          logger.info(`🤖 [STREAM] Tool call detected: "${block.name}" (generating input parameters)`);
        }
      }

      // Chunk delta handles progressive text/JSON tokens
      if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type === 'text_delta') {
          accumulatedText += chunk.delta.text;
          process.stdout.write(chunk.delta.text);
        } else if (chunk.delta.type === 'input_json_delta') {
          partialJson += chunk.delta.partial_json;
          process.stdout.write('.'); // Draw progress dots for json generation
        }
      }

      // Chunk stop parses full JSON parameters
      if (chunk.type === 'content_block_stop') {
        if (accumulatedToolUse) {
          try {
            accumulatedToolUse.input = JSON.parse(partialJson);
            console.log(); // Break progress dots line
          } catch (e) {
            logger.error(`Failed to parse streamed JSON: ${partialJson}`);
          }
        }
      }

      // Capture usage numbers from the stream termination block
      if (chunk.type === 'message_stop' && chunk.message && chunk.message.usage) {
        logger.trackUsage(chunk.message.usage);
      }
    }

    if (accumulatedToolUse) {
      const result = await executeTool(accumulatedToolUse.name, accumulatedToolUse.input);
      
      const assistantContent = [];
      if (accumulatedText) {
        assistantContent.push({ type: 'text', text: accumulatedText });
      }
      assistantContent.push({
        type: 'tool_use',
        id: accumulatedToolUse.id,
        name: accumulatedToolUse.name,
        input: accumulatedToolUse.input
      });

      messages.push({ role: 'assistant', content: assistantContent });
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: accumulatedToolUse.id,
            content: JSON.stringify(result)
          }
        ]
      });
      step++;
    } else {
      console.log("\n");
      break;
    }
  }

  logger.printSessionSummary();
}
