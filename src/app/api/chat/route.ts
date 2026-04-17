import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findSimilarChunks } from "@/lib/vectors";
import { streamChat, hasRealApiKey } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, style } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // RAG: Vector similarity search for relevant chunks
    const latestMessage = messages[messages.length - 1].content;
    const relevantChunks = await findSimilarChunks(latestMessage, user.id, 5);

    const contextText = relevantChunks.length > 0
      ? relevantChunks.map((c, i) => `[Chunk ${i + 1} (relevance: ${(c.similarity * 100).toFixed(0)}%)]\n${c.content}`).join("\n\n")
      : "No study notes uploaded yet. Still act as a knowledgeable tutor.";

    const systemInstructions = `You are Learnexa, an expert personalized AI tutor.
Teaching Style: ${style || "Beginner Friendly"}. Please format your response in markdown.

### RELEVANT CONTEXT FROM USER'S STUDY NOTES (retrieved via semantic search):
${contextText}

### INSTRUCTIONS:
- Always use the provided context to answer questions when relevant
- If the context doesn't cover the question, use your general knowledge but mention that it's not from their notes
- Decline politely if asked to stray far from study purposes
- Adapt strictly to the requested teaching style
- Use examples, analogies, and structured formatting for clarity
- When explaining concepts, break them into digestible parts`;

    if (!hasRealApiKey()) {
      // Return a simulated stream response
      const mockResponse = `**Mock Response** (connect your Google API key for real AI)\n\nI received your question and would search through your notes using semantic similarity.\n\n**Teaching Style:** ${style}\n\n**Context Retrieved:** ${relevantChunks.length} relevant chunks found.\n\nIn production, I would provide a detailed, ${style?.toLowerCase() || "beginner-friendly"} explanation based on your uploaded materials.`;
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const parts = mockResponse.split(" ");
          for (let i = 0; i < parts.length; i++) {
            controller.enqueue(encoder.encode(parts[i] + " "));
            await new Promise(r => setTimeout(r, 30));
          }
          controller.close();
        }
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // Real AI streaming with RAG context
    try {
      const chatStream = await streamChat(messages.slice(0, -1), latestMessage, systemInstructions);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of chatStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        }
      });

      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } catch (apiError: any) {
      console.warn("AI API Error in Chat, falling back to mock:", apiError.message);

      
      // Fallback stream if API fails (e.g. Quota Exceeded)
      const mockResponse = `**API Error/Quota Exceeded:** I couldn't generate a real response due to an API limit or error.\n\nHere is a simulated response based on your notes:\n\n**Teaching Style:** ${style}\n\n**Notes Context:** I found ${relevantChunks.length} relevant sections from your materials. Keep practicing!`;
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const parts = mockResponse.split(" ");
          for (let i = 0; i < parts.length; i++) {
            controller.enqueue(encoder.encode(parts[i] + " "));
            await new Promise(r => setTimeout(r, 20));
          }
          controller.close();
        }
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    
  } catch (error: any) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
