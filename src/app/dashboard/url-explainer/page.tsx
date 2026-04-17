"use client";

import React, { useState } from "react";
import { Globe, Link as LinkIcon, List, Zap, BookOpen, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import "./url.css";

export default function UrlExplainerPage() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"simplify" | "bullets" | "insights">("simplify");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsLoading(true);
    setOutput("");
    
    try {
      const res = await fetch("/api/url-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format }),
      });
      const data = await res.json();
      if (data.error) {
        setOutput(`Error: ${data.error}`);
      } else {
        setOutput(data.result);
      }
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="url-explainer-container">
      <div className="bg-mesh"></div>
      
      <header className="url-header">
        <a href="/dashboard" className="back-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'rgba(255, 255, 255, 0.6)', transition: 'all 0.2s ease'}}>
          <ArrowLeft size={20} />
        </a>
        <h1 className="url-title">
          <Globe size={32} className="text-secondary" />
          <span>URL Explainer</span>
        </h1>
      </header>

      <div className="url-layout">
        {/* Left Panel: Input Area */}
        <section className="input-section glass-panel" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} className="form-group animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Article / Blog URL</label>
              <div style={{ position: 'relative' }}>
                <LinkIcon size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="url-input"
                  style={{ paddingLeft: '3rem' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explanation Format</label>
              <div className="format-options">
                
                <div 
                  className={`format-card ${format === "simplify" ? "active" : ""}`}
                  onClick={() => setFormat("simplify")}
                >
                  <div className="format-icon"><Zap size={20} /></div>
                  <span className="format-title">Simplify</span>
                  <span className="format-desc">Explain as if for a beginner</span>
                </div>

                <div 
                  className={`format-card ${format === "bullets" ? "active" : ""}`}
                  onClick={() => setFormat("bullets")}
                >
                  <div className="format-icon"><List size={20} /></div>
                  <span className="format-title">Bullets</span>
                  <span className="format-desc">Key takeaways in bullet points</span>
                </div>

                <div 
                  className={`format-card ${format === "insights" ? "active" : ""}`}
                  onClick={() => setFormat("insights")}
                >
                  <div className="format-icon"><BookOpen size={20} /></div>
                  <span className="format-title">Insights</span>
                  <span className="format-desc">Comprehensive structured summary</span>
                </div>

              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: 'auto', padding: '1rem' }}
            >
              {isLoading ? "Reading Article..." : "Analyze URL"}
              {!isLoading && <Sparkles size={18} />}
            </button>
          </form>
        </section>

        {/* Right Panel: Output Area */}
        <section className="output-section glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)' }}>AI Analysis</h3>
              {!isLoading && output && <Globe size={16} style={{ opacity: 0.5 }} />}
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', height: '100%', color: 'rgba(255, 255, 255, 0.4)' }}>
                <Loader2 size={30} className="animate-spin text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                <p>Downloading and parsing webpage...</p>
              </div>
            ) : output ? (
              <div className="prose prose-invert max-w-none" style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'rgba(255, 255, 255, 0.85)' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{output}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', gap: '1rem' }}>
                <LinkIcon size={48} style={{ opacity: 0.2 }} />
                <p>Paste a URL to get a clean, intelligent breakdown of its contents.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
