import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findSimilarChunks } from "@/lib/vectors";
import { generateText, hasRealApiKey } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, difficulty = "medium", types = ["mcq", "short"], count = 5 } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get relevant chunks for context
    const relevantChunks = await findSimilarChunks(topic, user.id, 5);
    const contextText = relevantChunks.length > 0
      ? relevantChunks.map((c) => c.content).join("\n\n")
      : "No specific notes available. Generate general knowledge questions.";

    const prompt = `Generate exactly ${count} quiz questions about "${topic}" at ${difficulty} difficulty level.

Question types to include: ${types.join(", ")}

Context from study notes:
${contextText}

Return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "questions": [
    {
      "type": "mcq",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A"
    },
    {
      "type": "short",
      "question": "Question text?",
      "answer": "Expected answer"
    },
    {
      "type": "long",
      "question": "Question text?",
      "answer": "Expected detailed answer"
    },
    {
      "type": "viva",
      "question": "Question text?",
      "answer": "Expected answer"
    }
  ]
}

Rules:
- MCQ must have exactly 4 options
- Mix question types as specified
- Questions should test understanding, not just memorization
- For ${difficulty} difficulty: ${
      (({ easy: "basic recall and simple concepts", medium: "application and analysis level", hard: "synthesis, evaluation, and tricky edge cases" }) as Record<string, string>)[difficulty as string] || "application and analysis level"}`;

    const responseText = await generateText(prompt, "You are an expert quiz generator for educational assessment.");

    // Parse the response
    let parsed;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      console.error("Failed to parse quiz response:", responseText);
      return NextResponse.json({ error: "Failed to generate valid quiz. Please try again." }, { status: 500 });
    }

    // Create the quiz in the database
    const quiz = await prisma.quiz.create({
      data: {
        userId: user.id,
        topic,
        difficulty,
        totalQuestions: parsed.questions.length,
        questions: {
          create: parsed.questions.map((q: any) => ({
            type: q.type,
            question: q.question,
            options: q.options ? JSON.stringify(q.options) : null,
            answer: q.answer,
          })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        totalQuestions: quiz.totalQuestions,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options ? JSON.parse(q.options) : null,
          // Don't send the answer to the client
        })),
      },
    });
  } catch (error: any) {
    console.error("Quiz Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
