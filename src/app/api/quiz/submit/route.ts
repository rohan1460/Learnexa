import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId, answers } = await req.json();
    // answers: [{ questionId: string, userAnswer: string, timeTaken?: number }]

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz || quiz.userId !== user.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let correctCount = 0;
    const evaluationResults: any[] = [];

    for (const question of quiz.questions) {
      const userAnswerData = answers.find((a: any) => a.questionId === question.id);
      const userAnswer = userAnswerData?.userAnswer || "";
      const timeTaken = userAnswerData?.timeTaken || null;

      let isCorrect = false;

      if (question.type === "mcq") {
        // MCQ: exact match
        isCorrect = userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
      } else {
        // Short/Long/Viva: use AI to evaluate if answer is semantically correct
        if (userAnswer.trim()) {
          try {
            const evalPrompt = `Evaluate this student answer.

Question: ${question.question}
Correct Answer: ${question.answer}
Student Answer: ${userAnswer}

Is the student's answer correct or substantially correct? Consider partial credit.
Reply with ONLY valid JSON (no markdown): {"isCorrect": true/false, "explanation": "brief explanation"}`;

            const evalResponse = await generateText(evalPrompt, "You are a fair academic evaluator.");
            const jsonMatch = evalResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const evalResult = JSON.parse(jsonMatch[0]);
              isCorrect = evalResult.isCorrect;
            }
          } catch {
            // Fallback: simple string comparison
            isCorrect = userAnswer.trim().toLowerCase().includes(question.answer.trim().toLowerCase().substring(0, 20));
          }
        }
      }

      if (isCorrect) correctCount++;

      // Update the question record
      await prisma.quizQuestion.update({
        where: { id: question.id },
        data: {
          userAnswer,
          isCorrect,
          timeTaken,
        },
      });

      evaluationResults.push({
        questionId: question.id,
        question: question.question,
        correctAnswer: question.answer,
        userAnswer,
        isCorrect,
        type: question.type,
      });

      // Update weakness records for wrong answers
      if (!isCorrect) {
        await prisma.weaknessRecord.upsert({
          where: {
            userId_topic: {
              userId: user.id,
              topic: quiz.topic,
            },
          },
          update: {
            wrongCount: { increment: 1 },
            totalCount: { increment: 1 },
            avgTime: timeTaken || 0,
          },
          create: {
            userId: user.id,
            topic: quiz.topic,
            wrongCount: 1,
            totalCount: 1,
            avgTime: timeTaken || 0,
          },
        });
      } else {
        // Also track correct answers in weakness records for accuracy calculation
        await prisma.weaknessRecord.upsert({
          where: {
            userId_topic: {
              userId: user.id,
              topic: quiz.topic,
            },
          },
          update: {
            totalCount: { increment: 1 },
          },
          create: {
            userId: user.id,
            topic: quiz.topic,
            wrongCount: 0,
            totalCount: 1,
            avgTime: timeTaken || 0,
          },
        });
      }
    }

    // Update quiz score
    const score = Math.round((correctCount / quiz.questions.length) * 100);
    await prisma.quiz.update({
      where: { id: quizId },
      data: { score },
    });

    return NextResponse.json({
      success: true,
      score,
      correctCount,
      totalQuestions: quiz.questions.length,
      results: evaluationResults,
    });
  } catch (error: any) {
    console.error("Quiz Submit Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
