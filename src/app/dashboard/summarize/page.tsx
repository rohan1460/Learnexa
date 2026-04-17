"use client";

import React, { useState, useEffect } from "react";
import { FileText, Loader2, Copy, Check, BookOpen, Sparkles } from "lucide-react";
import "./summarize.css";

interface NoteItem {
  id: string;
  title: string;
  chunksCount: number;
}

const STYLES = [
  { id: "bullet-points", label: "📋 Bullet Points", desc: "Concise bullets grouped by topic" },
  { id: "paragraph", label: "📝 Paragraph", desc: "Flowing narrative summary" },
  { id: "key-concepts", label: "🔑 Key Concepts", desc: "Terms, definitions & concepts" },
  { id: "exam-prep", label: "🎯 Exam Prep", desc: "Facts, formulas & likely questions" },
];

export default function SummarizePage() {
  const [inputText, setInputText] = useState("");
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [style, setStyle] = useState("bullet-points");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"paste" | "notes">("paste");

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((d) => setNotes(d.notes || []))
      .catch(() => {});
  }, []);

  const handleSummarize = async () => {
    if (!inputText.trim() && !selectedNote) return;
    setIsLoading(true);
    setSummary("");

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tab === "paste" ? inputText : undefined,
          noteId: tab === "notes" ? selectedNote : undefined,
          style,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to summarize");
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err: any) {
      setSummary(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="summarize-page animate-fade-in">
      <div className="page-header">
        <h1>Text Summarization</h1>
        <p>Generate AI-powered summaries from your text or uploaded notes.</p>
      </div>

      <div className="summarize-input-section">
        <div className="tab-buttons">
          <button className={`tab-btn ${tab === "paste" ? "active" : ""}`} onClick={() => setTab("paste")}>
            <FileText size={14} style={{ display: "inline", marginRight: "0.4rem" }} />
            Paste Text
          </button>
          <button className={`tab-btn ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>
            <BookOpen size={14} style={{ display: "inline", marginRight: "0.4rem" }} />
            From Notes ({notes.length})
          </button>
        </div>

        {tab === "paste" ? (
          <textarea
            className="text-paste-area"
            placeholder="Paste your study material, lecture notes, or any text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={8}
          />
        ) : (
          <div className="notes-select-list">
            {notes.length === 0 ? (
              <div className="empty-state" style={{ padding: "1.5rem" }}>
                No notes uploaded yet. Upload study notes first.
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className={`note-select-item ${selectedNote === note.id ? "selected" : ""}`}
                  onClick={() => setSelectedNote(note.id)}
                >
                  <div className="note-select-info">
                    <h4>{note.title}</h4>
                    <span>{note.chunksCount} chunks</span>
                  </div>
                  {selectedNote === note.id && <Check size={18} style={{ color: "var(--primary)" }} />}
                </div>
              ))
            )}
          </div>
        )}

        <div className="style-picker">
          <label>Summary Style:</label>
          <div className="style-options">
            {STYLES.map((s) => (
              <button
                key={s.id}
                className={`style-option ${style === s.id ? "active" : ""}`}
                onClick={() => setStyle(s.id)}
              >
                <span className="style-main">{s.label}</span>
                <span className="style-desc">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleSummarize}
          disabled={isLoading || (tab === "paste" ? !inputText.trim() : !selectedNote)}
          style={{ width: "100%", display: "flex", justifyContent: "center", gap: "0.5rem" }}
        >
          {isLoading ? (
            <>
              <Loader2 className="spinner" size={18} /> Summarizing...
            </>
          ) : (
            <>
              <Sparkles size={18} /> Generate Summary
            </>
          )}
        </button>
      </div>

      {summary && (
        <div className="summary-result animate-fade-in">
          <div className="summary-header">
            <h3>📄 Summary</h3>
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
          <div className="summary-content" dangerouslySetInnerHTML={{
            __html: summary
              .replace(/\n/g, "<br/>")
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/^## (.*)/gm, "<h3>$1</h3>")
              .replace(/^### (.*)/gm, "<h4>$1</h4>")
              .replace(/^- (.*)/gm, "<li>$1</li>")
              .replace(/^(\d+)\. (.*)/gm, "<li>$1. $2</li>")
          }} />
        </div>
      )}
    </div>
  );
}
