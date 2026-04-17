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

    const { text, noteId, style = "bullet-points" } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let contentToSummarize = text || "";

    // If noteId is provided, get content from the note
    if (noteId && !text) {
      const note = await prisma.studyNote.findUnique({
        where: { id: noteId },
      });
      if (!note || note.userId !== user.id) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
      contentToSummarize = note.content;
    }

    if (!contentToSummarize.trim()) {
      return NextResponse.json({ error: "No text to summarize" }, { status: 400 });
    }

    const styleInstructions: Record<string, string> = {
      "bullet-points": "Summarize in clear bullet points. Group related ideas under sub-headings.",
      "paragraph": "Write a cohesive paragraph summary that flows naturally.",
      "key-concepts": "Extract and explain the key concepts, terms, and definitions. Format as a concept list.",
      "exam-prep": "Create an exam-preparation summary with key facts, formulas, definitions, and likely exam questions.",
    };

    const prompt = `Summarize the following content.

Style: ${style}
${styleInstructions[style] || styleInstructions["bullet-points"]}

Content to summarize:
${contentToSummarize.substring(0, 8000)}

Format your response in clean markdown.`;

    const summary = await generateText(prompt, "You are an expert academic summarizer who creates clear, concise, and well-structured summaries.");

    return NextResponse.json({ summary, style });
  } catch (error: any) {
    console.error("Summarize Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
