import 'dotenv/config';
import { runHumanInLoopDemo } from '../src/patterns/humanInLoop.js';

runHumanInLoopDemo().catch(err => {
  console.error('Fatal error in Human-in-the-Loop Example:', err);
  process.exit(1);
});
