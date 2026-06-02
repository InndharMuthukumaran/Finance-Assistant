import 'dotenv/config';
import { runDynamicSelectionDemo } from '../src/patterns/dynamicSelection.js';

runDynamicSelectionDemo().catch(err => {
  console.error('Fatal error in Dynamic Selection Example:', err);
  process.exit(1);
});
