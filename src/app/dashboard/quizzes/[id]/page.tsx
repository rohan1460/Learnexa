"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Send, Trophy, Clock, BookOpen, BarChart3 } from "lucide-react";
import "../quizzes.css";

interface Question {
  id: string;
  type: string;
  question: string;
  options: string[] | null;
}

interface QuizData {
  id: string;
  topic: string;
  difficulty: string;
  totalQuestions: number;
  questions: Question[];
}

interface ResultData {
  score: number;
  correctCount: number;
  totalQuestions: number;
  results: {
    questionId: string;
    question: string;
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
    type: string;
  }[];
}

export default function QuizTakingPage() {
  const params = useParams();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTimes, setStartTimes] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<ResultData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      // Fetch quiz via generate endpoint — we'll use the quizId from URL
      // The quiz is already created, so we fetch it from DB
      const res = await fetch(`/api/quiz/${quizId}`);
      if (!res.ok) throw new Error("Failed to load quiz");
      const data = await res.json();
      setQuiz(data.quiz);

      // Initialize start times for all questions
      const times: Record<string, number> = {};
      data.quiz.questions.forEach((q: Question) => {
        times[q.id] = Date.now();
      });
      setStartTimes(times);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (isSubmitting || !quiz) return;
    setIsSubmitting(true);
    setError("");

    try {
      const submissionAnswers = quiz.questions.map((q) => ({
        questionId: q.id,
        userAnswer: answers[q.id] || "",
        timeTaken: startTimes[q.id]
          ? Math.round((Date.now() - startTimes[q.id]) / 1000)
          : null,
      }));

      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, answers: submissionAnswers }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit quiz");
      }

      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="quiz-taking animate-fade-in" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Loader2 className="spinner" size={36} style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="quiz-taking animate-fade-in">
        <div className="error-alert">
          <span>{error}</span>
        </div>
        <a href="/dashboard/quizzes" className="btn-secondary back-btn">
          <ArrowLeft size={16} /> Back to Quizzes
        </a>
      </div>
    );
  }

  // Results View
  if (results) {
    return (
      <div className="quiz-taking animate-fade-in">
        <div className="results-header">
          <Trophy size={48} style={{ color: results.score >= 70 ? "#22c55e" : results.score >= 40 ? "#f59e0b" : "#ef4444", margin: "0 auto" }} />
          <div className={`results-score ${results.score >= 70 ? "score-high" : results.score >= 40 ? "score-mid" : "score-low"}`}>
            {results.score}%
          </div>
          <p className="results-subtitle">
            {results.correctCount} of {results.totalQuestions} correct
          </p>
        </div>

        {results.results.map((r, i) => (
          <div key={r.questionId} className={`result-card ${r.isCorrect ? "correct" : "incorrect"}`}>
            <div className="question-number">
              Question {i + 1}
              <span className={`question-type-badge badge-${r.type}`}>{r.type.toUpperCase()}</span>
              {r.isCorrect ? (
                <CheckCircle2 size={18} style={{ color: "#22c55e", marginLeft: "auto", float: "right" }} />
              ) : (
                <XCircle size={18} style={{ color: "#ef4444", marginLeft: "auto", float: "right" }} />
              )}
            </div>
            <p className="question-text">{r.question}</p>
            <div className="result-answer-section">
              {r.userAnswer && (
                <div>
                  <span className="result-label">Your answer: </span>
                  <span className={r.isCorrect ? "correct-answer-text" : "wrong-answer-text"}>
                    {r.userAnswer}
                  </span>
                </div>
              )}
              {!r.isCorrect && (
                <div>
                  <span className="result-label">Correct answer: </span>
                  <span className="correct-answer-text">{r.correctAnswer}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <a href="/dashboard/quizzes" className="btn-secondary back-btn">
            <ArrowLeft size={16} /> Back to Quizzes
          </a>
          <a href="/dashboard/weaknesses" className="btn-primary back-btn">
            <BookOpen size={16} /> View Weaknesses
          </a>
        </div>
      </div>
    );
  }

  // Quiz Taking View
  return (
    <div className="quiz-taking animate-fade-in">
      <div className="quiz-taking-header">
        <a href="/dashboard/quizzes" style={{ color: "var(--primary)", fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginBottom: "1rem" }}>
          <ArrowLeft size={14} /> Back
        </a>
        <h1>{quiz?.topic}</h1>
        <div className="quiz-meta-bar">
          <span><BookOpen size={14} /> {quiz?.totalQuestions} questions</span>
          <span><BarChart3 size={14} /> {quiz?.difficulty}</span>
          <span><Clock size={14} /> All at once</span>
        </div>
      </div>

      {error && (
        <div className="error-alert" style={{ marginBottom: "1.5rem" }}>
          <span>{error}</span>
        </div>
      )}

      <div className="questions-list">
        {quiz?.questions.map((q, index) => (
          <div key={q.id} className="question-card">
            <div className="question-number">
              Question {index + 1}
              <span className={`question-type-badge badge-${q.type}`}>{q.type.toUpperCase()}</span>
            </div>
            <p className="question-text">{q.question}</p>

            {q.type === "mcq" && q.options ? (
              <div className="mcq-options">
                {q.options.map((option, oi) => (
                  <label
                    key={oi}
                    className={`mcq-option ${answers[q.id] === option ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={option}
                      checked={answers[q.id] === option}
                      onChange={() => handleAnswerChange(q.id, option)}
                    />
                    <span className="mcq-radio"></span>
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="text-answer"
                placeholder={
                  q.type === "short"
                    ? "Type your short answer..."
                    : q.type === "viva"
                    ? "Type your viva response..."
                    : "Type your detailed answer..."
                }
                value={answers[q.id] || ""}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                rows={q.type === "long" ? 6 : 3}
              />
            )}
          </div>
        ))}
      </div>

      <button
        className="btn-primary submit-quiz-btn"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="spinner" size={18} />
            Evaluating Answers...
          </>
        ) : (
          <>
            <Send size={18} />
            Submit Quiz
          </>
        )}
      </button>
    </div>
  );
}
