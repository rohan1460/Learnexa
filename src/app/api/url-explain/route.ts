import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateText } from "@/lib/gemini";
import * as cheerio from "cheerio";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, format } = await req.json();
    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
    }

    // 1. Fetch the raw HTML from the URL
    let htmlContent = "";
    try {
        const fetchRes = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        if (!fetchRes.ok) {
            throw new Error(`Failed to fetch URL: ${fetchRes.statusText}`);
        }
        htmlContent = await fetchRes.text();
    } catch (e: any) {
        return NextResponse.json({ error: `Could not access the URL (${e.message}). Please ensure it's publicly accessible.` }, { status: 400 });
    }

    // 2. Extract meaningful text using Cheerio
    const $ = cheerio.load(htmlContent);
    // Remove scripts, styles, and other non-content tags
    $("script, style, noscript, iframe, nav, footer, header").remove();
    
    // Extract text from the body segment
    let textContent = $("body").text();
    
    // Clean up whitespace
    textContent = textContent.replace(/\s+/g, " ").trim();
    
    if (!textContent) {
        return NextResponse.json({ error: "Could not extract any readable text from this URL." }, { status: 400 });
    }

    // Truncate to avoid massive token costs (roughly ~5000 words max)
    const MAX_CHARS = 30000;
    if (textContent.length > MAX_CHARS) {
        textContent = textContent.substring(0, MAX_CHARS) + "...[Content Truncated]";
    }

    // 3. Format the Prompt
    let systemInstruction = "You are an expert content summarizer and explainer. Provide clean, well-formatted markdown.";
    let prompt = "";

    if (format === "bullets") {
        prompt = `Please read the following extracted article text and provide a comprehensive summary using **clear bullet points**. Highlight the main ideas, key takeaways, and any important data:\n\nSource URL: ${url}\n\nText:\n${textContent}`;
    } else if (format === "simplify") {
        prompt = `Please read the following extracted article text and explain its core concepts in **simple, easy-to-understand language** suitable for a beginner. Avoid jargon where possible. Include a brief summary at the top:\n\nSource URL: ${url}\n\nText:\n${textContent}`;
    } else {
        // default insights format
        prompt = `Please provide a structured summary of the following article text. Include a "TL;DR", "Key Insights", and "Conclusion" section.\n\nSource URL: ${url}\n\nText:\n${textContent}`;
    }

    // 4. Generate the response via AI
    const result = await generateText(prompt, systemInstruction);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("URL Explainer Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process URL" }, { status: 500 });
  }
}
