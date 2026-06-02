import 'dotenv/config';
import { runMultiAgentDemo } from '../src/patterns/multiAgent.js';

runMultiAgentDemo().catch(err => {
  console.error('Fatal error in Multi-Agent Example:', err);
  process.exit(1);
});
