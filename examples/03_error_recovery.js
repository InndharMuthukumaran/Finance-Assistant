import 'dotenv/config';
import { runErrorRecoveryDemo } from '../src/patterns/errorRecovery.js';

runErrorRecoveryDemo().catch(err => {
  console.error('Fatal error in Error Recovery Example:', err);
  process.exit(1);
});
