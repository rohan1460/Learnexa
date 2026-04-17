"use client";

import React, { useState, useEffect } from "react";
import SmartDropzone from "@/components/SmartDropzone";
import { FileText, Trash2, Loader2, Database } from "lucide-react";

interface NoteItem {
  id: string;
  title: string;
  preview: string;
  chunksCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setNotes(data.notes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this note and all its chunks?")) return;
    setDeletingId(noteId);

    try {
      const res = await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="page-header">
        <h1>Smart Notes Ingestion</h1>
        <p>Upload your study materials (PDF, TXT, PPTX) to generate your vector knowledge base.</p>
      </div>

      <div className="ingestion-section">
        <SmartDropzone onIngestComplete={fetchNotes} />
      </div>

      <div className="recently-uploaded">
        <h3>
          <Database size={18} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
          Your Study Notes ({notes.length})
        </h3>
        
        {isLoading ? (
          <div className="empty-state" style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
            <Loader2 className="spinner" size={24} style={{ color: "var(--primary)" }} />
          </div>
        ) : notes.length === 0 ? (
          <div className="empty-state">
            No study notes yet. Upload a file above to get started.
          </div>
        ) : (
          <div className="notes-list">
            {notes.map((note) => (
              <div key={note.id} className="note-item">
                <div className="note-icon">
                  <FileText size={20} />
                </div>
                <div className="note-details">
                  <h4 className="note-title">{note.title}</h4>
                  <p className="note-preview">{note.preview}...</p>
                  <div className="note-meta">
                    <span>{note.chunksCount} chunks</span>
                    <span>·</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  className="note-delete-btn"
                  onClick={() => handleDelete(note.id)}
                  disabled={deletingId === note.id}
                  title="Delete note"
                >
                  {deletingId === note.id ? (
                    <Loader2 className="spinner" size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
