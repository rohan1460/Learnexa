import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, lang = "en" } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Limit text length for TTS
    const truncatedText = text.substring(0, 500);
    
    // Use Google Translate TTS (free, no API key)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(truncatedText)}&tl=${lang}&client=tw-ob`;

    // Fetch the audio from Google TTS
    const audioResponse = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://translate.google.com/",
      },
    });

    if (!audioResponse.ok) {
      // Fallback: return a URL for the client to use directly
      return NextResponse.json({
        success: true,
        audioUrl: ttsUrl,
        fallback: true,
        message: "Use browser SpeechSynthesis as fallback",
      });
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error("TTS Error:", error);
    // Fallback response
    return NextResponse.json({
      success: false,
      fallback: true,
      message: "Use browser SpeechSynthesis as fallback",
    });
  }
}
