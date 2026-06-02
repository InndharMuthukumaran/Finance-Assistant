import 'dotenv/config';
import { runCompositionDemo } from '../src/patterns/composition.js';

runCompositionDemo().catch(err => {
  console.error('Fatal error in Composition Example:', err);
  process.exit(1);
});
