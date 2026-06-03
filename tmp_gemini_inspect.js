import 'dotenv/config';
import { getModel } from './src/utils/gemini.js';

async function main() {
  const chat = getModel().startChat();
  const result = await chat.sendMessage('Please convert 250 EUR to USD, and also calculate the 18% tax on a 1500 USD expense.');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
