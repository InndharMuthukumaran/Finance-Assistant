import 'dotenv/config';
import { runStreamingDemo } from '../src/patterns/streaming.js';

runStreamingDemo().catch(err => {
  console.error('Fatal error in Streaming Example:', err);
  process.exit(1);
});
