import OpenAI from "openai";

const openRouterApiKey = process.env.OPENROUTER_API_KEY;

const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: openRouterApiKey || "missing",
});

const grokApiKey = process.env.GROQ_API_KEY;

const grok = new OpenAI({
  baseURL: "https://api.x.ai/v1",
  apiKey: grokApiKey || "missing",
});

// We keep this function strictly for backwards compatibility logic in other files.
export function hasRealApiKey(): boolean {
  return !!openRouterApiKey && !!grokApiKey;
}

function getLoadBalancedClient() {
  // Grok API key provided is invalid (returns 400 Incorrect API Key).
  // Falling back entirely to OpenRouter for now to prevent application crashes.
  return { client: openRouter, model: "openai/gpt-4o-mini" };
}

/**
 * Generate a text response (non-streaming) for quick tasks.
 */
export async function generateText(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  try {
    const { client, model } = getLoadBalancedClient();

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const completion = await client.chat.completions.create({
      model: model,
      messages: messages as any,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("API Error in generateText:", error?.message || error);
    throw new Error(`AI API Error: ${error?.message || "Failed to generate content"}`);
  }
}

/**
 * Perform a streaming chat (compatible format with OpenAI)
 */
export async function streamChat(
  chatHistory: { role: string; content: string }[],
  latestMessage: string,
  systemInstruction?: string
): Promise<AsyncIterable<string>> {
  const { client, model } = getLoadBalancedClient();

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  chatHistory.forEach(m => {
    messages.push({ role: m.role, content: m.content });
  });
  messages.push({ role: "user", content: latestMessage });

  const stream = await client.chat.completions.create({
    model: model,
    messages: messages as any,
    stream: true,
  });

  async function* generateStream() {
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) yield text;
    }
  }

  return generateStream();
}

/**
 * Generate an embedding utilizing OpenRouter (jina-embeddings)
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openRouter.embeddings.create({
    model: "jinaai/jina-embeddings-v2-base-en",
    input: text,
  });
  return response.data[0].embedding;
}
