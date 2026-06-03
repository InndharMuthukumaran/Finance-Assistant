import 'dotenv/config';
import { runConditionalDemo } from '../src/patterns/conditional.js';

runConditionalDemo().catch(err => {
  console.error('Fatal error in Conditional Example:', err);
  process.exit(1);
});
