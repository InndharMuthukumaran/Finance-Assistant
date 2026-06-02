import 'dotenv/config';
import { runLimitsDemo } from '../src/patterns/limits.js';

runLimitsDemo().catch(err => {
  console.error('Fatal error in Limits Example:', err);
  process.exit(1);
});
