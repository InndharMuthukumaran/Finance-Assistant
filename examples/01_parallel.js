import 'dotenv/config';
import { runParallelDemo } from '../src/patterns/parallel.js';

runParallelDemo().catch(err => {
  console.error('Fatal error in Parallel Example:', err);
  process.exit(1);
});
