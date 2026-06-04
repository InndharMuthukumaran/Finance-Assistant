import { getModel } from '../utils/gemini.js';
import { allToolsSchemas, executeTool } from '../utils/toolRunner.js';
import { logger } from '../utils/logger.js';

/**
 * Output Validation Pattern
 * Demonstrates validating Gemini responses for correctness,
 * handling invalid outputs, and optionally retrying with constraints.
 */
export async function runValidationDemo() {
  const prompt = `You must provide a JSON response with exactly this structure:
{
  "expense_name": "string",
  "amount": number,
  "category": "one of: food, transport, entertainment, other",
  "timestamp": "ISO 8601 date"
}

Create a sample expense record for a coffee purchase for $5.50 today.
Only respond with valid JSON, no extra text.`;

  logger.info(`Starting Output Validation Demo...`);
  logger.info(`Query: Validate structured JSON response format`);

  const model = getModel(allToolsSchemas);
  const chat = model.startChat();

  const result = await chat.sendMessage(prompt);
  const response = result.response;
  logger.trackUsage(response.usageMetadata);

  const responseText = response.text();
  console.log(`\n📝 Raw Gemini Response:\n${responseText}\n`);

  // Validate response format
  let parsedResponse = null;
  let isValid = false;
  const errors = [];

  // Step 1: Try JSON parsing
  try {
    parsedResponse = JSON.parse(responseText);
    logger.info('✅ Response is valid JSON');
  } catch (e) {
    errors.push(`❌ Invalid JSON: ${e.message}`);
  }

  // Step 2: Validate required fields
  if (parsedResponse) {
    const requiredFields = ['expense_name', 'amount', 'category', 'timestamp'];
    const missingFields = requiredFields.filter(f => !(f in parsedResponse));
    if (missingFields.length > 0) {
      errors.push(`❌ Missing fields: ${missingFields.join(', ')}`);
    } else {
      logger.info('✅ All required fields present');
    }
  }

  // Step 3: Validate field types and constraints
  if (parsedResponse) {
    if (typeof parsedResponse.expense_name !== 'string') {
      errors.push('❌ expense_name must be a string');
    } else {
      logger.info('✅ expense_name is a string');
    }

    if (typeof parsedResponse.amount !== 'number' || parsedResponse.amount <= 0) {
      errors.push('❌ amount must be a positive number');
    } else {
      logger.info('✅ amount is a positive number');
    }

    const validCategories = ['food', 'transport', 'entertainment', 'other'];
    if (!validCategories.includes(parsedResponse.category)) {
      errors.push(`❌ category must be one of: ${validCategories.join(', ')}`);
    } else {
      logger.info('✅ category is valid');
    }

    if (!parsedResponse.timestamp || isNaN(Date.parse(parsedResponse.timestamp))) {
      errors.push('❌ timestamp must be a valid ISO 8601 date');
    } else {
      logger.info('✅ timestamp is valid ISO 8601');
    }
  }

  // Step 4: Determine overall validity
  if (errors.length === 0 && parsedResponse) {
    isValid = true;
    logger.info('✅ Validation passed! Response is correct.');
  } else {
    logger.warn(`Validation failed with ${errors.length} error(s)`);
  }

  // Print validation results
  console.log(`\n🔍 Validation Results:`);
  if (isValid) {
    console.log('✅ All checks passed!\n');
    console.log('Parsed Record:', JSON.stringify(parsedResponse, null, 2));
  } else {
    console.log(`Errors found:\n${errors.join('\n')}`);
    if (parsedResponse) {
      console.log('\nPartially parsed:', JSON.stringify(parsedResponse, null, 2));
    }
  }

  logger.printSessionSummary();
}
