import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateText, hasRealApiKey } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!hasRealApiKey()) {
      // Return a placeholder SVG diagram
      const svg = generatePlaceholderDiagram(prompt);
      return NextResponse.json({
        image: svg,
        type: "svg",
        message: "Mock diagram generated. Connect a real API key for AI-generated images.",
      });
    }

    // Use Gemini to generate a text-based diagram description,
    // then create an SVG from it
    const diagramPrompt = `Create a simple, clean SVG diagram for the following topic. Return ONLY valid SVG code, no markdown.

Topic: ${prompt}

Requirements:
- Use a dark theme (background: #18181b, text: white, accents: #8b5cf6 and #06b6d4)
- Max viewport: 600x400
- Keep it simple and educational
- Use shapes, arrows, and labels to explain the concept
- Include a title`;

    const svgResponse = await generateText(diagramPrompt, "You are an expert at creating educational SVG diagrams.");
    
    // Extract SVG from response
    const svgMatch = svgResponse.match(/<svg[\s\S]*<\/svg>/);
    if (svgMatch) {
      return NextResponse.json({
        image: svgMatch[0],
        type: "svg",
      });
    }

    // Fallback
    return NextResponse.json({
      image: generatePlaceholderDiagram(prompt),
      type: "svg",
      message: "Generated a placeholder diagram.",
    });
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generatePlaceholderDiagram(topic: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect width="600" height="400" rx="12" fill="#18181b"/>
  <text x="300" y="40" text-anchor="middle" fill="#a78bfa" font-size="20" font-weight="bold">${escapeXml(topic)}</text>
  <rect x="200" y="80" width="200" height="60" rx="8" fill="none" stroke="#8b5cf6" stroke-width="2"/>
  <text x="300" y="115" text-anchor="middle" fill="white" font-size="14">Core Concept</text>
  <line x1="300" y1="140" x2="300" y2="180" stroke="#06b6d4" stroke-width="2" marker-end="url(#arrow)"/>
  <rect x="100" y="180" width="160" height="50" rx="8" fill="none" stroke="#06b6d4" stroke-width="2"/>
  <text x="180" y="210" text-anchor="middle" fill="white" font-size="12">Sub-concept A</text>
  <rect x="340" y="180" width="160" height="50" rx="8" fill="none" stroke="#06b6d4" stroke-width="2"/>
  <text x="420" y="210" text-anchor="middle" fill="white" font-size="12">Sub-concept B</text>
  <line x1="260" y1="180" x2="180" y2="180" stroke="#06b6d4" stroke-width="2"/>
  <line x1="340" y1="180" x2="420" y2="180" stroke="#06b6d4" stroke-width="2"/>
  <rect x="100" y="270" width="400" height="80" rx="8" fill="rgba(139,92,246,0.1)" stroke="#8b5cf6" stroke-width="1"/>
  <text x="300" y="300" text-anchor="middle" fill="#a78bfa" font-size="13">Key takeaway: Understanding ${escapeXml(topic)}</text>
  <text x="300" y="325" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="11">Connect a real API key for AI-generated diagrams</text>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#06b6d4"/>
    </marker>
  </defs>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
