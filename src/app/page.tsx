"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, Library, Zap } from "lucide-react";
import "./page.css"; // We'll create this to contain the specific page styles

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="landing-container">
      <div className="bg-mesh"></div>
      
      {/* Navigation */}
      <nav className="navbar animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="logo-container">
          <BrainCircuit className="logo-icon animate-pulse-glow" />
          <span className="logo-text">AI Study<span className="text-gradient">Companion</span></span>
        </div>
        <div className="nav-links">
          <a href="/login" className="btn-secondary">Sign In</a>
          <a href="/register" className="btn-primary" style={{ marginLeft: "1rem" }}>Get Started</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Master Any Subject with <br />
          <span className="text-gradient">Personalized AI</span>
        </h1>
        <p className="hero-subtitle animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Upload your notes, generate adaptive quizzes, and chat with an intelligent multi-modal tutor designed exclusively for your learning style.
        </p>
        
        <div className="cta-container animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <button className="btn-primary hero-btn">
            Start Learning <ArrowRight size={18} style={{ marginLeft: "8px" }} />
          </button>
        </div>

        {/* Feature Cards Showcase */}
        <div className="features-grid animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="glass-panel feature-card">
            <div className="icon-wrapper" style={{ background: "rgba(139, 92, 246, 0.2)", color: "var(--primary)" }}>
              <Library size={24} />
            </div>
            <h3>Smart Ingestion</h3>
            <p>Upload PDFs, PPTs, or text. We structure it into a personal semantic knowledge base.</p>
          </div>
          
          <div className="glass-panel feature-card">
            <div className="icon-wrapper" style={{ background: "rgba(6, 182, 212, 0.2)", color: "var(--secondary)" }}>
              <Zap size={24} />
            </div>
            <h3>Adaptive Quizzes</h3>
            <p>Dynamic difficulty adjustments and targeted weakness tracking to ace your exams.</p>
          </div>
          
          <div className="glass-panel feature-card">
            <div className="icon-wrapper" style={{ background: "rgba(236, 72, 153, 0.2)", color: "#ec4899" }}>
              <BrainCircuit size={24} />
            </div>
            <h3>RAG Study Chat</h3>
            <p>Converse with your notes. Get step-by-step explanations via text and voice.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
