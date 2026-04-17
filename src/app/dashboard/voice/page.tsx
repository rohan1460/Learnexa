"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Loader2, Volume2, MicOff, MessageSquare } from "lucide-react";
import "./voice.css";

// Declare types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  role: "user" | "model";
  content: string;
}

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onend = () => {
          if (isListening) {
            handleSpeechEnd();
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          setTranscript("");
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopAudio();
    };
  }, [isListening]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  const toggleListening = () => {
    if (isProcessing || isSpeaking) {
      stopAudio();
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start listening", e);
      }
    }
  };

  const handleSpeechEnd = async () => {
    setIsListening(false);
    const finalTranscript = transcript.trim();
    
    if (!finalTranscript) return;

    setTranscript("");
    
    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: finalTranscript }
    ];
    setMessages(newMessages);
    setIsProcessing(true);

    try {
      // 1. Get AI Response from /api/chat
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          style: "Conversational, short responses perfect for voice interaction"
        }),
      });

      if (!chatRes.ok) throw new Error("Failed to get chat response");
      
      const aiText = await chatRes.text();
      // Remove any markdown strong tags for clean text reading
      const cleanAiText = aiText.replace(/\\*\\*/g, "").replace(/#/g, "");
      
      setMessages([...newMessages, { role: "model", content: cleanAiText }]);
      setIsProcessing(false);

      // 2. Convert AI Response to Speech
      playTTS(cleanAiText);

    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  const playTTS = async (text: string) => {
    try {
      setIsSpeaking(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: "en" }),
      });

      if (!res.ok) {
        throw new Error("TTS failed");
      }

      const audioBuffer = await res.arrayBuffer();
      
      // Use Web Audio API to play
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const decodedData = await ctx.decodeAudioData(audioBuffer);
      audioSourceRef.current = ctx.createBufferSource();
      audioSourceRef.current.buffer = decodedData;
      audioSourceRef.current.connect(ctx.destination);
      
      audioSourceRef.current.onended = () => {
        setIsSpeaking(false);
      };

      audioSourceRef.current.start(0);

    } catch (error) {
      console.error("Audio playback error:", error);
      setIsSpeaking(false);
      // Fallback to browser synthesis if API fails
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      }
    }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  return (
    <div className="voice-page animate-fade-in">
      <div className="page-header">
        <h1>Voice to Voice</h1>
        <p>Talk naturally with your study materials. Hands-free AI study sessions.</p>
      </div>

      <div className="voice-container">
        <div className="conversation-area">
          {messages.length === 0 && !transcript ? (
            <div className="empty-state">
              <MicOff size={48} style={{ opacity: 0.2, marginBottom: "1rem" }} />
              <h3>Ready to listen</h3>
              <p>Click the microphone and ask a question about your study notes.</p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <div className="message-label">{msg.role === "user" ? "You" : "AI Companion"}</div>
                  <div>{msg.content}</div>
                </div>
              ))}
              {transcript && (
                <div className="message user" style={{ opacity: 0.7 }}>
                  <div className="message-label">Listening...</div>
                  <div>{transcript}</div>
                </div>
              )}
              {isProcessing && (
                <div className="message ai">
                  <div className="message-label">AI Companion</div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Loader2 size={16} className="spinner" /> Thinking...
                  </div>
                </div>
              )}
              <div ref={messageEndRef} />
            </>
          )}
        </div>

        <div className="controls-area">
          {isSpeaking && (
            <div className="audio-visualizer">
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
              <div className="audio-bar"></div>
            </div>
          )}
          
          <button 
            className={`mic-button ${isListening ? "listening" : ""} ${isProcessing ? "processing" : ""} ${isSpeaking ? "speaking" : ""}`}
            onClick={toggleListening}
            disabled={isProcessing}
          >
            {isSpeaking ? (
               <Volume2 size={32} />
            ) : isProcessing ? (
               <Loader2 size={32} className="spinner" />
            ) : (
               <Mic size={32} />
            )}
          </button>
          
          <div className="status-text">
            {isSpeaking ? (
              <span className="speaking-text">AI is speaking... (Click to stop)</span>
            ) : isProcessing ? (
              <span className="processing-text">Processing your request...</span>
            ) : isListening ? (
              <span className="listening-text">Listening... (Speak now)</span>
            ) : (
              <span>Tap microphone to start talking</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
