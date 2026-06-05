import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Generic Production-Grade Schema Validator
 * Validates any tool's arguments against its registered schema.
 * Running this locally costs 0 tokens.
 */
function validateToolArguments(toolName, args) {
  // 1. Locate the tool schema dynamically from the registry
  const schema = allToolsSchemas.find(s => s.name === toolName);
  if (!schema) {
    return { 
      valid: false, 
      error: `Validation Error: Tool "${toolName}" is not registered in the schema registry.` 
    };
  }

  // Anthropic format uses "input_schema", Gemini uses "parameters"
  const inputSchema = schema.input_schema || schema.parameters || {};
  const { required = [], properties = {} } = inputSchema;

  // 2. Verify all required parameters are present
  for (const reqField of required) {
    if (args[reqField] === undefined || args[reqField] === null) {
      return { 
        valid: false, 
        error: `Validation Error: Missing required parameter "${reqField}" for tool "${toolName}".` 
      };
    }
  }

  // 3. Verify types and constraints of passed parameters
  for (const [key, val] of Object.entries(args)) {
    const propSchema = properties[key];
    
    // Check if LLM sent a parameter that does not exist in the schema
    if (!propSchema) {
      return { 
        valid: false, 
        error: `Validation Error: Unexpected parameter "${key}" passed to tool "${toolName}".` 
      };
    }

    // Validate type (number, string, boolean)
    const expectedType = propSchema.type;
    const actualType = typeof val;

    if (expectedType === 'number' && actualType !== 'number') {
      return { 
        valid: false, 
        error: `Validation Error: Parameter "${key}" must be a number, got "${actualType}".` 
      };
    }
    if (expectedType === 'string' && actualType !== 'string') {
      return { 
        valid: false, 
        error: `Validation Error: Parameter "${key}" must be a string, got "${actualType}".` 
      };
    }
    if (expectedType === 'boolean' && actualType !== 'boolean') {
      return { 
        valid: false, 
        error: `Validation Error: Parameter "${key}" must be a boolean, got "${actualType}".` 
      };
    }

    // Validate enum constraints
    if (propSchema.enum && !propSchema.enum.includes(val)) {
      return { 
        valid: false, 
        error: `Validation Error: Parameter "${key}" value "${val}" is invalid. Must be one of: ${propSchema.enum.join(', ')}` 
      };
    }
  }

  return { valid: true };
}

/**
 * Output Validation Pattern (Dynamic Tool-Calling Verification)
 * 
 * Demonstrates local, zero-token cost checks on tool parameters against
 * their schemas, and triggers a recovery loop if validation fails.
 */
export async function runValidationDemo() {
  logger.info(`Starting Cost-Optimal Schema Validation Demo...`);

  // Prompt designed to force an invalid enum value "log" (which violates the enum ["add", "list", "total"])
  const query = "Track an expense of $120 for groceries. Use the action name 'log' in the tool parameters.";
  console.log(`\n📝 User Query: "${query}"`);

  const model = getModel(allToolsSchemas);
  const chat = model.startChat();

  let nextMessage = query;
  let step = 1;

  while (step <= 3) {
    logger.info(`Sending message to Gemini (Turn ${step})...`);
    const result = await chat.sendMessage(nextMessage);
    const response = result.response;
    logger.trackUsage(response.usageMetadata);
    
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      console.log(`\n💬 Gemini's Final Response:\n${response.text()}\n`);
      break;
    }

    const toolResponses = [];
    
    for (const fc of functionCalls) {
      logger.info(`Gemini requested tool: "${fc.name}" with args: ${JSON.stringify(fc.args)}`);

      // Dynamically validate arguments against registered schema
      const validation = validateToolArguments(fc.name, fc.args);
      
      if (!validation.valid) {
        logger.warn(`⚠️ [SCHEMA VALIDATION FAILED]: ${validation.error}`);
        // Feed the validation error back to Gemini as a tool response
        toolResponses.push({
          functionResponse: {
            name: fc.name,
            response: { error: validation.error }
          }
        });
      } else {
        logger.info(`✓ [SCHEMA VALIDATION PASSED] Arguments for "${fc.name}" are correct.`);
        
        // Execute tool since schema check passed
        const toolResult = await executeTool(fc.name, fc.args);
        
        toolResponses.push({
          functionResponse: {
            name: fc.name,
            response: { result: JSON.stringify(toolResult) }
          }
        });
      }
    }

    nextMessage = toolResponses;
    step++;
  }

  logger.printSessionSummary();
}
