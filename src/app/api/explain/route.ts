import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findSimilarChunks } from "@/lib/vectors";
import { generateText } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, style = "Beginner-friendly", depth = "detailed" } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get relevant context from user's notes
    const relevantChunks = await findSimilarChunks(topic, user.id, 5);
    const contextText = relevantChunks.length > 0
      ? relevantChunks.map((c) => c.content).join("\n\n")
      : "No specific study notes available.";

    const styleInstructions: Record<string, string> = {
      "Beginner-friendly": "Explain like the student is encountering this topic for the first time. Use simple language, analogies, and avoid jargon.",
      "Exam-oriented": "Focus on what's likely to be tested in exams. Include key definitions, formulas, and common exam questions.",
      "Step-by-step": "Break down the explanation into numbered steps. Each step should build on the previous one.",
      "Example-based": "Teach primarily through examples. Start with simple examples and progress to complex ones.",
      "Short": "Give a concise, to-the-point explanation. No more than 200 words.",
      "Detailed": "Give a comprehensive, thorough explanation covering all aspects of the topic.",
    };

    const prompt = `Explain the topic: "${topic}"

Teaching Style: ${style}
${styleInstructions[style] || "Provide a clear, well-structured explanation."}

Depth: ${depth}

Context from student's notes:
${contextText}

Format your response in markdown with proper headings, bullet points, and emphasis where appropriate.`;

    const explanation = await generateText(prompt, "You are an expert tutor who adapts explanations to the student's preferred learning style.");

    return NextResponse.json({ explanation, style, topic });
  } catch (error: any) {
    console.error("Explain Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
