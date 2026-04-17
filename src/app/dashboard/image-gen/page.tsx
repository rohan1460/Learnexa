"use client";

import React, { useState } from "react";
import { ImageIcon, Loader2, Download, Sparkles } from "lucide-react";
import "./image-gen.css";

const STYLE_PRESETS = [
  { id: "educational diagram", label: "📊 Diagram" },
  { id: "concept art illustration", label: "🎨 Concept Art" },
  { id: "infographic design", label: "📋 Infographic" },
  { id: "study poster", label: "📌 Study Poster" },
  { id: "mind map visualization", label: "🧠 Mind Map" },
  { id: "scientific illustration", label: "🔬 Scientific" },
];

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
}

export default function ImageGenPage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("educational diagram");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate image");
      }

      const data = await res.json();
      setImages((prev) => [
        {
          id: Date.now().toString(),
          prompt: data.prompt,
          imageUrl: data.imageUrl,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      setPrompt("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="image-gen-page animate-fade-in">
      <div className="page-header">
        <h1>AI Image Generation</h1>
        <p>Generate educational images, diagrams, and visual aids using Stable Diffusion.</p>
      </div>

      <div className="gen-form">
        <textarea
          className="gen-prompt"
          placeholder="Describe the image you want... e.g., 'Neural network architecture with labeled layers'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
        />

        <div className="style-presets">
          {STYLE_PRESETS.map((s) => (
            <button
              key={s.id}
              className={`preset-btn ${style === s.id ? "active" : ""}`}
              onClick={() => setStyle(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-alert" style={{ margin: 0 }}>
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          style={{ width: "100%", display: "flex", justifyContent: "center", gap: "0.5rem" }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="spinner" size={18} /> Generating Image...
            </>
          ) : (
            <>
              <Sparkles size={18} /> Generate Image
            </>
          )}
        </button>
      </div>

      {images.length > 0 && (
        <div className="generated-images">
          <h3>Generated Images</h3>
          <div className="images-grid">
            {images.map((img) => (
              <div key={img.id} className="image-card">
                <div className="image-wrapper">
                  <img
                    src={img.imageUrl}
                    alt={img.prompt}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<div class="image-error">Image loading... This may take a moment.</div>';
                    }}
                  />
                </div>
                <div className="image-info">
                  <p className="image-prompt-text">{img.prompt}</p>
                  <div className="image-actions">
                    <a
                      href={img.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <Download size={12} /> Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
