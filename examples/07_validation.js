import 'dotenv/config';
import { runValidationDemo } from '../src/patterns/validation.js';

runValidationDemo().catch(err => {
  console.error('Fatal error in Validation Example:', err);
  process.exit(1);
});
