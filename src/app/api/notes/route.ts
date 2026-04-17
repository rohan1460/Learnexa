import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notes = await prisma.studyNote.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    return NextResponse.json({
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        preview: n.content.substring(0, 200),
        chunksCount: n._count.chunks,
        createdAt: n.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Notes GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const note = await prisma.studyNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.userId !== user.id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Delete chunks first (cascade should handle, but be explicit)
    await prisma.noteChunk.deleteMany({ where: { noteId: noteId } });
    await prisma.studyNote.delete({ where: { id: noteId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notes DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
