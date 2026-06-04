import 'dotenv/config';
import { runCostOptimizeDemo } from '../src/patterns/costOptimize.js';

runCostOptimizeDemo().catch(err => {
  console.error('Fatal error in Cost Optimize Example:', err);
  process.exit(1);
});
// intentionally empty - not used by examples 01 or 02
