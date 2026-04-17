import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PDFParse } from "pdf-parse";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

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
    const fileName = file.name.toLowerCase();

    // Determine conversion direction
    if (fileName.endsWith(".pdf")) {
      // PDF → DOCX
      return await convertPdfToDocx(buffer, file.name);
    } else if (fileName.endsWith(".docx")) {
      // DOCX → PDF
      return await convertDocxToPdf(buffer, file.name);
    } else {
      return NextResponse.json(
        { error: "Unsupported format. Upload a .pdf or .docx file." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Conversion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function convertPdfToDocx(buffer: Buffer, originalName: string) {
  // Extract text from PDF
  const parser = new PDFParse({ 
    data: new Uint8Array(buffer),
    disableWorker: true,
    verbosity: 0
  });
  const parsed = await parser.getText();
  const text = parsed.text || "";

  if (!text.trim()) {
    return NextResponse.json({ error: "No text could be extracted from this PDF" }, { status: 400 });
  }

  // Create DOCX from extracted text
  const paragraphs = text.split("\n").filter((line: string) => line.trim()).map((line: string) => {
    // Detect headings (lines that are short and might be titles)
    const isHeading = line.length < 80 && line === line.toUpperCase() && line.trim().length > 2;
    
    return new Paragraph({
      children: [
        new TextRun({
          text: line.trim(),
          bold: isHeading,
          size: isHeading ? 28 : 22,
          font: "Arial",
        }),
      ],
      heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
      spacing: { after: 120 },
    });
  });

  // Add title
  paragraphs.unshift(
    new Paragraph({
      children: [
        new TextRun({
          text: originalName.replace(".pdf", ""),
          bold: true,
          size: 36,
          font: "Arial",
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const docxBuffer = await Packer.toBuffer(doc);
  const outputName = originalName.replace(".pdf", ".docx");

  return new NextResponse(new Uint8Array(docxBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${outputName}"`,
      "Content-Length": docxBuffer.byteLength.toString(),
    },
  });
}

async function convertDocxToPdf(buffer: Buffer, originalName: string) {
  // Extract text from DOCX using JSZip
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  
  // Get document.xml content
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) {
    return NextResponse.json({ error: "Invalid DOCX file" }, { status: 400 });
  }

  // Extract text from XML
  const textContent = docXml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!textContent.trim()) {
    return NextResponse.json({ error: "No text found in DOCX file" }, { status: 400 });
  }

  // Generate PDF using jsPDF
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 6;
  let y = margin;

  // Add title
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  const title = originalName.replace(".docx", "");
  pdf.text(title, margin, y);
  y += 12;

  // Add content
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");

  const words = textContent.split(" ");
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = pdf.getTextWidth(testLine);

    if (testWidth > maxWidth) {
      pdf.text(line, margin, y);
      line = word;
      y += lineHeight;

      // Check if we need a new page
      if (y > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    pdf.text(line, margin, y);
  }

  const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));
  const outputName = originalName.replace(".docx", ".pdf");

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${outputName}"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}
