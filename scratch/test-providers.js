require('dotenv').config();
const { generateText, streamChat } = require('./src/lib/gemini');

async function run() {
  console.log("=== Testing generateText ===");
  try {
    const text1 = await generateText("What is the capital of France?");
    console.log("Response 1:", text1);
    const text2 = await generateText("What is the capital of Japan?");
    console.log("Response 2:", text2);
    
    console.log("\n=== Testing streamChat ===");
    const stream = await streamChat([], "Who are you?", "You are a helpful assistant.");
    process.stdout.write("Stream reading: ");
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    console.log("\nDone!");
  } catch(e) {
    console.error("Test failed:", e);
  }
}

// Ensure typescript code compiles for test
require('ts-node').register({
  compilerOptions: { module: "commonjs" }
});
run();
