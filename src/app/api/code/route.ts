import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateText } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { mode } = body;

    let prompt = "";
    let systemInstruction = "";

    if (mode === "explain") {
      const { code } = body;
      if (!code) return NextResponse.json({ error: "Code snippet is required" }, { status: 400 });

      systemInstruction = "You are an expert programming mentor. Your task is to explain the provided code snippets in a clear, beginner-friendly way. Focus on generic programming knowledge and explain the mechanics, logic, and potential edge cases of the provided code.";
      prompt = `Please explain the following code in detail, breaking down what it does line-by-line if necessary, and discussing its purpose and logic:\n\n\`\`\`\n${code}\n\`\`\``;
      
    } else if (mode === "generate") {
      const { problem, language } = body;
      if (!problem || !language) return NextResponse.json({ error: "Problem description and language are required" }, { status: 400 });

      systemInstruction = "You are a senior software engineer. Write clean, efficient, and well-documented code that strictly adheres to the requested programming language's best practices.";
      prompt = `Write code in ${language} to solve the following problem or meet the following requirement:\n\n${problem}\n\nPlease include comments explaining key parts of the logic and format the final code nicely.`;
      
    } else {
      return NextResponse.json({ error: "Invalid mode. Use 'explain' or 'generate'." }, { status: 400 });
    }

    const result = await generateText(prompt, systemInstruction);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Code API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
