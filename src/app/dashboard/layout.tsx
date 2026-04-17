import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BookOpen, User, LogOut, Sparkles, MessageSquare, Code, Layers, Target, FileText, ImageIcon, Volume2, ArrowRightLeft, Mic, Globe } from "lucide-react";
import "./dashboard.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="font-bold">Learnexa</span>
        </div>
        
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item">
            <Sparkles size={18} /> Ingest Notes
          </a>
          <a href="/dashboard/chat" className="nav-item">
            <MessageSquare size={18} /> Study Chat
          </a>
          <a href="/dashboard/quizzes" className="nav-item">
            <Layers size={18} /> Quizzes
          </a>
          <a href="/dashboard/code" className="nav-item">
            <Code size={18} /> Code Assistant
          </a>
          <a href="/dashboard/url-explainer" className="nav-item">
            <Globe size={18} /> URL Explainer
          </a>
          
          <div className="nav-divider" />

          <a href="/dashboard/summarize" className="nav-item">
            <FileText size={18} /> Summarize
          </a>
          <a href="/dashboard/image-gen" className="nav-item">
            <ImageIcon size={18} /> Image Gen
          </a>
          <a href="/dashboard/voice" className="nav-item">
            <Mic size={18} /> Voice Chat
          </a>
          <a href="/dashboard/tts" className="nav-item">
            <Volume2 size={18} /> Text-to-Voice
          </a>
          <a href="/dashboard/convert" className="nav-item">
            <ArrowRightLeft size={18} /> Convert
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <User size={18} />
            <span className="truncate">{session.user?.email}</span>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button className="logout-btn">
              <LogOut size={16} /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
