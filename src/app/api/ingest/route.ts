import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/vectors";
import { PDFParse } from "pdf-parse";

/**
 * Simple recursive character text splitter (replaces langchain dependency).
 */
function splitTextIntoChunks(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  const separators = ["\n\n", "\n", ". ", " "];
  
  function splitRecursive(text: string, seps: string[]): string[] {
    if (text.length <= chunkSize) return [text];
    
    const sep = seps[0] || "";
    const parts = sep ? text.split(sep) : [text];
    const results: string[] = [];
    let current = "";
    
    for (const part of parts) {
      const combined = current ? current + sep + part : part;
      if (combined.length > chunkSize && current) {
        results.push(current.trim());
        // Keep overlap
        const overlapStart = Math.max(0, current.length - overlap);
        current = current.substring(overlapStart) + sep + part;
      } else {
        current = combined;
      }
    }
    if (current.trim()) results.push(current.trim());
    
    // If we couldn't split well enough and there's another separator to try
    if (results.length === 1 && results[0].length > chunkSize && seps.length > 1) {
      return splitRecursive(results[0], seps.slice(1));
    }
    
    return results;
  }
  
  return splitRecursive(text, separators).filter(c => c.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let textContent = "";

    // 1. Parsing Phase
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      console.log(`Ingest: Parsing PDF ${file.name} (${buffer.length} bytes)`);
      try {
        const parser = new PDFParse({ 
          data: new Uint8Array(buffer),
          disableWorker: true,
          verbosity: 0
        });
        const parsed = await parser.getText();
        textContent = parsed.text || "";
        console.log(`Ingest: Successfully extracted ${textContent.length} characters from PDF`);
      } catch (pdfErr: any) {
        console.error("Ingest: PDF parsing failed:", pdfErr);
        throw new Error(`PDF parsing failed: ${pdfErr.message}`);
      }
    } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      textContent = buffer.toString("utf-8");
    } else if (
      file.name.endsWith(".pptx") ||
      file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      // Basic PPTX text extraction — extract text from XML slides
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
      );
      const slideTexts = await Promise.all(
        slideFiles.map(async (name) => {
          const xml = await zip.files[name].async("string");
          return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        })
      );
      textContent = slideTexts.join("\n\n");
    } else {
      return NextResponse.json({ error: "Unsupported file type. Supported: PDF, TXT, PPTX" }, { status: 400 });
    }

    if (!textContent.trim()) {
      return NextResponse.json({ error: "No text content could be extracted from this file" }, { status: 400 });
    }

    // 2. Get the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) throw new Error("User not found");

    // 3. Create the Study Note
    const note = await prisma.studyNote.create({
      data: {
        userId: user.id,
        title: file.name,
        content: textContent.substring(0, 10000),
      },
    });

    // 4. Chunking Phase (using built-in splitter)
    const chunks = splitTextIntoChunks(textContent);

    // 5. Generate embeddings and store NoteChunks
    let embeddedCount = 0;
    for (const chunkContent of chunks) {
      try {
        const embedding = await generateEmbedding(chunkContent);
        await prisma.noteChunk.create({
          data: {
            noteId: note.id,
            content: chunkContent,
            embedding: JSON.stringify(embedding),
          },
        });
        embeddedCount++;
      } catch (embErr) {
        // If embedding fails for a chunk, still store it without embedding
        await prisma.noteChunk.create({
          data: {
            noteId: note.id,
            content: chunkContent,
          },
        });
      }
    }

    console.log(`✅ Ingested ${file.name}: ${chunks.length} chunks, ${embeddedCount} embedded`);

    return NextResponse.json({
      success: true,
      noteId: note.id,
      chunksCount: chunks.length,
      embeddedCount,
      message: `Note successfully ingested! ${chunks.length} semantic chunks created.`,
    });
    
  } catch (error: any) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
