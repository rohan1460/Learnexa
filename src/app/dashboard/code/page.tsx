"use client";

import React, { useState } from "react";
import { Code, Send, Play, Type, ArrowLeft, Terminal, Cpu, Sparkles } from "lucide-react";
import "./code.css";

export default function CodeAssistantPage() {
  const [activeTab, setActiveTab] = useState<"explain" | "generate">("explain");
  const [explainCode, setExplainCode] = useState("");
  const [genProblem, setGenProblem] = useState("");
  const [genLanguage, setGenLanguage] = useState("Python");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const languages = ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby", "Swift", "SQL"];

  const handleExplainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explainCode.trim()) return;
    
    setIsLoading(true);
    setOutput("");
    
    try {
      const res = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "explain", code: explainCode }),
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

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genProblem.trim()) return;
    
    setIsLoading(true);
    setOutput("");
    
    try {
      const res = await fetch("/api/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate", problem: genProblem, language: genLanguage }),
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
    <div className="code-assistant-container">
      <div className="bg-mesh"></div>
      
      <header className="code-header">
        <a href="/dashboard" className="back-link">
          <ArrowLeft size={20} />
        </a>
        <h1 className="code-title">
          <Terminal size={32} className="text-secondary" />
          <span>Code Assistant</span>
        </h1>
      </header>

      <div className="code-layout">
        {/* Left Panel: Input Area */}
        <section className="input-section glass-panel">
          <div className="tabs">
            <button
              onClick={() => setActiveTab("explain")}
              className={`tab-btn ${activeTab === "explain" ? "active" : ""}`}
            >
              <Type size={18} /> Explain
            </button>
            <button
              onClick={() => setActiveTab("generate")}
              className={`tab-btn ${activeTab === "generate" ? "active" : ""}`}
            >
              <Cpu size={18} /> Generate
            </button>
          </div>

          {activeTab === "explain" ? (
            <form onSubmit={handleExplainSubmit} className="form-group animate-fade-in">
              <label>Code Snippet</label>
              <textarea
                value={explainCode}
                onChange={(e) => setExplainCode(e.target.value)}
                placeholder="// Paste your code here..."
                className="code-textarea"
                required
              />
              <button
                type="submit"
                disabled={isLoading || !explainCode.trim()}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                {isLoading ? "Analyzing..." : "Explain Code"}
                {!isLoading && <Sparkles size={18} />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleGenerateSubmit} className="form-group animate-fade-in">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Target Language</label>
                <select
                  value={genLanguage}
                  onChange={(e) => setGenLanguage(e.target.value)}
                  className="lang-select"
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <label>What should the code do?</label>
                <textarea
                  value={genProblem}
                  onChange={(e) => setGenProblem(e.target.value)}
                  placeholder="e.g., Create a responsive navigation bar using CSS Grid..."
                  className="problem-textarea"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !genProblem.trim()}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                {isLoading ? "Generating..." : "Generate Code"}
                {!isLoading && <Send size={18} />}
              </button>
            </form>
          )}
        </section>

        {/* Right Panel: Output Area */}
        <section className="output-section glass-panel">
          <div className="output-container">
            <div className="output-header">
              <h3>AI Response</h3>
              {!isLoading && output && <Code size={16} style={{ opacity: 0.5 }} />}
            </div>

            {isLoading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Consulting with AI engineers...</p>
              </div>
            ) : output ? (
              <div className="output-content">
                <div style={{ whiteSpace: 'pre-wrap' }}>{output}</div>
              </div>
            ) : (
              <div className="empty-output">
                <Play size={48} style={{ opacity: 0.2 }} />
                <p>Provide some input on the left to see the AI magic happen.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
