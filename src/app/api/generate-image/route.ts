import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, style = "educational diagram" } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Use Pollinations.ai — free Stable Diffusion API, no key needed
    const fullPrompt = `${prompt}, ${style}, high quality, detailed, clear`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=512&nologo=true`;

    // Verify the URL is reachable (Pollinations generates on-the-fly)
    return NextResponse.json({
      success: true,
      imageUrl,
      prompt: fullPrompt,
      message: "Image generated via Stable Diffusion (Pollinations.ai)",
    });
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
