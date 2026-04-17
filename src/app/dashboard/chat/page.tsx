"use client";

import React, { useState, useRef, useEffect } from "react";
import { BrainCircuit, Send, User, Settings2, Loader2, Volume2, VolumeX, Mic, MicOff, Image as ImageIcon } from "lucide-react";
import "./chat.css";

type Message = { id: string; role: 'user' | 'assistant'; content: string; image?: string };

export default function StudyChatPage() {
  const [learningStyle, setLearningStyle] = useState("Beginner-friendly");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          style: learningStyle,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch response");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text-to-Speech
  const handleSpeak = (messageId: string, text: string) => {
    if (isSpeaking === messageId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(messageId);
  };

  // Speech-to-Text
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // Generate Diagram
  const handleGenerateDiagram = async () => {
    if (!input.trim()) return;
    setIsLoading(true);

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: `🖼️ Generate a diagram: ${input}` };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      if (!res.ok) throw new Error("Failed to generate diagram");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message || "Here's your diagram:",
          image: data.image,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "Failed to generate diagram. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container animate-fade-in">
      <div className="chat-header">
        <h2><BrainCircuit className="text-primary" /> Learnexa Study Chat</h2>
        
        <div className="style-selector">
          <Settings2 size={16} />
          <label htmlFor="style">Style:</label>
          <select 
            id="style" 
            className="style-select" 
            value={learningStyle}
            onChange={(e) => setLearningStyle(e.target.value)}
            disabled={isLoading}
          >
            <option value="Beginner-friendly">Beginner Friendly</option>
            <option value="Exam-oriented">Exam Oriented</option>
            <option value="Step-by-step">Step-by-Step</option>
            <option value="Example-based">Example Based</option>
            <option value="Socratic Method">Socratic Method</option>
            <option value="Short">Short & Concise</option>
            <option value="Detailed">Detailed</option>
          </select>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state" style={{ margin: "auto", border: "none" }}>
            <BrainCircuit size={48} className="text-secondary" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
            <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Ask me anything about your notes!</h3>
            <p style={{ maxWidth: "400px", margin: "0 auto" }}>
              I use semantic search to find the most relevant parts of your uploaded materials. Try asking me to explain a topic in a <b>{learningStyle.toLowerCase()}</b> way.
            </p>
            <div className="chat-suggestions">
              <button className="suggestion-chip" onClick={() => setInput("Summarize my notes on the main concepts")}>
                📚 Summarize main concepts
              </button>
              <button className="suggestion-chip" onClick={() => setInput("Explain the most important topic in simple terms")}>
                💡 Explain simply
              </button>
              <button className="suggestion-chip" onClick={() => setInput("What are the key formulas I should know?")}>
                🔢 Key formulas
              </button>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`message-item ${m.role}`}>
              <div className="message-avatar">
                {m.role === "assistant" ? <BrainCircuit size={20} /> : <User size={20} />}
              </div>
              <div className="message-content-wrapper">
                <div className="message-bubble" style={{ whiteSpace: "pre-wrap" }}>
                  {m.content}
                  {m.image && (
                    <div className="message-image" dangerouslySetInnerHTML={{ __html: m.image }} />
                  )}
                </div>
                {m.role === "assistant" && m.content && (
                  <div className="message-actions">
                    <button
                      className={`action-btn ${isSpeaking === m.id ? "active" : ""}`}
                      onClick={() => handleSpeak(m.id, m.content)}
                      title={isSpeaking === m.id ? "Stop speaking" : "Read aloud"}
                    >
                      {isSpeaking === m.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="message-item assistant">
             <div className="message-avatar">
                <BrainCircuit size={20} />
             </div>
             <div className="message-bubble" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
               <Loader2 size={16} className="spinner" /> Thinking...
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-form">
          <div className="input-actions">
            <button
              type="button"
              className={`input-action-btn ${isListening ? "active listening" : ""}`}
              onClick={toggleListening}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              type="button"
              className="input-action-btn"
              onClick={handleGenerateDiagram}
              disabled={!input.trim() || isLoading}
              title="Generate diagram from input"
            >
              <ImageIcon size={18} />
            </button>
          </div>
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "🎤 Listening..." : "Ask about your notes, request explanations, or generate diagrams..."}
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />
          <button type="submit" className="send-btn" disabled={isLoading || !input.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
