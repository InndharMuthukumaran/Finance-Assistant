import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Dynamic Tool Selection Pattern:
 * The LLM intelligently selects which tool(s) to use based on:
 * 1. User intent (what they're asking for)
 * 2. Available tools and their descriptions
 * 3. Context and conversation history
 *
 * The model decides which tool is most appropriate without explicit routing.
 * This is more flexible than hard-coded if/else tool selection.
 */

/**
 * Run multiple sequential queries to showcase dynamic tool selection
 * Each query should trigger different tools based on its content
 */
export async function runDynamicSelectionDemo() {
  logger.info(`Starting Dynamic Tool Selection Demo...`);
  console.log(`\n🎯 Demo: LLM Dynamically Selects the Right Tool\n`);

  const model = getModel(allToolsSchemas);

  // Array of diverse queries that should trigger different tools
  const queries = [
    {
      query: "What's my entertainment budget and how much have I spent?",
      expectedTools: ["manage_budget"],
      description: "Budget inquiry - should use manage_budget tool"
    },
    {
      query: "I just spent $45 on groceries. Log it and tell me my total grocery spending.",
      expectedTools: ["track_expense"],
      description: "Expense tracking - should use track_expense tool"
    },
    {
      query: "Convert my $200 USD savings to EUR and then calculate 10% of that amount.",
      expectedTools: ["convert_currency", "calculate"],
      description: "Multi-step: currency conversion then calculation"
    },
    {
      query: "If I spend $75 on entertainment and have a $200 budget, what percentage is that?",
      expectedTools: ["calculate"],
      description: "Math calculation - should use calculate tool"
    },
    {
      query: "Show me all my expenses by category and my current budget limits.",
      expectedTools: ["track_expense", "manage_budget"],
      description: "Multiple lookups - should use both tools"
    }
  ];

  // Execute each query demonstrating dynamic tool selection
  for (let i = 0; i < queries.length; i++) {
    const { query, expectedTools, description } = queries[i];
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Query ${i + 1}: ${description}`);
    console.log(`📝 User: "${query}"`);
    console.log(`💡 Expected tool(s): ${expectedTools.join(', ')}`);
    console.log(`${'─'.repeat(70)}`);

    await processQueryWithDynamicSelection(query, expectedTools);
  }

  logger.printSessionSummary();
}

/**
 * Process a single query with dynamic tool selection
 */
async function processQueryWithDynamicSelection(query, expectedTools) {
  try {
    const model = getModel(allToolsSchemas);
    const chat = model.startChat();

    // Send the query to Gemini
    const result = await chat.sendMessage(query);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      console.log(`\n✅ Gemini's Response (no tools needed):\n${response.text()}\n`);
      return;
    }

    // Show which tools were actually selected
    const selectedTools = functionCalls.map(fc => fc.name);
    console.log(`\n🔧 Tools Selected: ${selectedTools.join(', ')}`);
    
    // Verify the selection was reasonable
    const unexpectedTools = selectedTools.filter(t => !expectedTools.includes(t));
    if (unexpectedTools.length === 0) {
      console.log(`✓ Tool selection matches expected pattern`);
    } else {
      logger.warn(`⚠️ Unexpected tools selected: ${unexpectedTools.join(', ')}`);
    }

    // Execute all tool calls
    const toolResponses = await Promise.all(
      functionCalls.map(async (fc) => {
        logger.info(`  → Executing: "${fc.name}" with args: ${JSON.stringify(fc.args)}`);
        const toolResult = await executeTool(fc.name, fc.args);
        
        console.log(`    Result: ${JSON.stringify(toolResult).substring(0, 100)}...`);
        
        return {
          functionResponse: {
            name: fc.name,
            response: { result: JSON.stringify(toolResult) }
          }
        };
      })
    );

    // Send results back for final synthesis
    const finalResult = await chat.sendMessage(toolResponses);
    console.log(`\n💬 Gemini's Synthesized Response:\n${finalResult.response.text()}`);

  } catch (error) {
    logger.error(`Error processing query: ${error.message}`);
    console.log(`❌ Error: ${error.message}`);
  }
}

/**
 * Alternative: Structured approach showing explicit tool descriptions
 * (Optional advanced feature for testing/debugging)
 */
export function showAvailableTools() {
  console.log(`\n📚 Available Tools for Dynamic Selection:\n`);
  
  allToolsSchemas.forEach((schema, index) => {
    console.log(`${index + 1}. ${schema.name}`);
    console.log(`   Description: ${schema.description}`);
    console.log(`   Parameters: ${Object.keys(schema.input_schema.properties || {}).join(', ')}\n`);
  });
}
