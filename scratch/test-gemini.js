require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
  try {
    console.log("Key:", process.env.GOOGLE_API_KEY ? "Loaded" : "Missing");
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    console.log("Testing chat model...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessageStream("Hi");
    
    let text = "";
    for await (const chunk of result.stream) {
      text += chunk.text();
    }
    console.log("Chat SUCCESS:", text.substring(0, 50));
    
    console.log("Testing embedding...");
    const emodel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const eresult = await emodel.embedContent("Hello world");
    console.log("Embedding SUCCESS! Length:", eresult.embedding.values.length);
    
  } catch(e) {
    console.error("FAILURE:", e.message);
  }
}

testGemini();
