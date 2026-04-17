"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Trophy, Clock, BarChart3, ArrowRight } from "lucide-react";
import "./quizzes.css";

interface Quiz {
  id: string;
  topic: string;
  difficulty: string;
  score: number | null;
  totalQuestions: number;
  createdAt: string;
}

export default function QuizzesPage() {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [types, setTypes] = useState<string[]>(["mcq", "short"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch("/api/quiz/generate");
      // We don't have a GET for quizzes yet, will just track locally
    } catch {}
  };

  const toggleType = (type: string) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isGenerating) return;
    setIsGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty, types, count: 5 }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate quiz");
      }

      const data = await res.json();
      
      // Navigate to the quiz taking page
      window.location.href = `/dashboard/quizzes/${data.quiz.id}`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="quizzes-page animate-fade-in">
      <div className="page-header">
        <h1>Quiz & Viva Generator</h1>
        <p>Generate adaptive quizzes from your study materials with AI-powered evaluation.</p>
      </div>

      {/* Generate Quiz Form */}
      <div className="quiz-generator">
        <h2><Sparkles size={20} className="text-primary" /> Generate New Quiz</h2>
        
        <form className="quiz-form" onSubmit={handleGenerate}>
          <div className="form-field">
            <label htmlFor="quiz-topic">Topic</label>
            <input
              id="quiz-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, Linear Algebra, World War II..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="quiz-difficulty">Difficulty</label>
              <select
                id="quiz-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="form-field">
              <label>Question Types</label>
              <div className="checkbox-group">
                {["mcq", "short", "long", "viva"].map((type) => (
                  <label
                    key={type}
                    className={`checkbox-label ${types.includes(type) ? "checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={types.includes(type)}
                      onChange={() => toggleType(type)}
                    />
                    {type.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="error-alert" style={{ margin: 0 }}>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary generate-btn"
            disabled={isGenerating || !topic.trim() || types.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="spinner" size={18} />
                Generating Quiz...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate 5-Question Quiz
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
