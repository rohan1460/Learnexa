"use client";

import React, { useState, useRef } from "react";
import { Volume2, Loader2, Download, Play, Square, Globe } from "lucide-react";
import "./tts.css";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh-CN", label: "Chinese" },
];

export default function TTSPage() {
  const [text, setText] = useState("");
  const [lang, setLang] = useState("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return;
    setIsGenerating(true);
    setError("");
    setAudioUrl(null);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("audio")) {
        // Got audio data back
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } else {
        // Fallback: use browser SpeechSynthesis
        const data = await res.json();
        if (data.fallback) {
          speakWithBrowser(text, lang);
        } else {
          throw new Error(data.error || "Failed to generate audio");
        }
      }
    } catch (err: any) {
      // Final fallback
      speakWithBrowser(text, lang);
    } finally {
      setIsGenerating(false);
    }
  };

  const speakWithBrowser = (text: string, lang: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else if (audioUrl) {
      // Create audio element
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    } else {
      // No audio URL, use browser TTS
      speakWithBrowser(text, lang);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  return (
    <div className="tts-page animate-fade-in">
      <div className="page-header">
        <h1>Text-to-Voice</h1>
        <p>Convert text to natural-sounding speech using gTTS. Supports multiple languages.</p>
      </div>

      <div className="tts-form">
        <textarea
          className="tts-input"
          placeholder="Type or paste the text you want to hear spoken..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />

        <div className="tts-controls">
          <div className="lang-selector">
            <Globe size={16} />
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="lang-select">
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="char-count">{text.length} / 500 chars</div>
        </div>

        {error && (
          <div className="error-alert" style={{ margin: 0 }}>
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={!text.trim() || isGenerating}
          style={{ width: "100%", display: "flex", justifyContent: "center", gap: "0.5rem" }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="spinner" size={18} /> Generating Audio...
            </>
          ) : (
            <>
              <Volume2 size={18} /> Generate Speech
            </>
          )}
        </button>
      </div>

      {/* Audio Player */}
      {(audioUrl || text.trim()) && !isGenerating && (
        <div className="audio-player animate-fade-in">
          <div className="player-visualizer">
            <div className={`sound-wave ${isPlaying ? "playing" : ""}`}>
              {[...Array(20)].map((_, i) => (
                <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
          </div>

          <div className="player-controls">
            <button className="play-btn" onClick={isPlaying ? handleStop : handlePlay}>
              {isPlaying ? <Square size={24} /> : <Play size={24} />}
            </button>

            {audioUrl && (
              <a href={audioUrl} download="speech.mp3" className="download-audio-btn">
                <Download size={16} /> Download MP3
              </a>
            )}
          </div>

          {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}
        </div>
      )}
    </div>
  );
}
