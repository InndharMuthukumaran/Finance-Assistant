import 'dotenv/config';
import { runChainingDemo } from '../src/patterns/chaining.js';

runChainingDemo().catch(err => {
  console.error('Fatal error in Chaining Example:', err);
  process.exit(1);
});
