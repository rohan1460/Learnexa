import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: true },
    });

    if (!quiz || quiz.userId !== user.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // If not yet submitted (score is null), don't send answers
    const questions = quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options ? JSON.parse(q.options) : null,
      ...(quiz.score !== null
        ? {
            answer: q.answer,
            userAnswer: q.userAnswer,
            isCorrect: q.isCorrect,
          }
        : {}),
    }));

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        totalQuestions: quiz.totalQuestions,
        score: quiz.score,
        questions,
      },
    });
  } catch (error: any) {
    console.error("Quiz GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
