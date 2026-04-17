"use client";

import React, { useState, useRef } from "react";
import { FileUp, Loader2, Download, ArrowRightLeft, FileText, File } from "lucide-react";
import "./convert.css";

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getConversionDirection = () => {
    if (!file) return null;
    if (file.name.toLowerCase().endsWith(".pdf")) return { from: "PDF", to: "DOCX", icon: "📄 → 📝" };
    if (file.name.toLowerCase().endsWith(".docx")) return { from: "DOCX", to: "PDF", icon: "📝 → 📄" };
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const name = selected.name.toLowerCase();
      if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
        setError("Only .pdf and .docx files are supported.");
        return;
      }
      setFile(selected);
      setError("");
      setResult(null);
    }
  };

  const handleConvert = async () => {
    if (!file || isConverting) return;
    setIsConverting(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("json")) {
        // Error response
        const data = await res.json();
        throw new Error(data.error || "Conversion failed");
      }

      // Success — got file back
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("content-disposition") || "";
      const nameMatch = disposition.match(/filename="(.+)"/);
      const outputName = nameMatch ? nameMatch[1] : file.name.replace(/\.\w+$/, contentType.includes("pdf") ? ".pdf" : ".docx");

      setResult({ url, name: outputName, type: contentType });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConverting(false);
    }
  };

  const direction = getConversionDirection();

  return (
    <div className="convert-page animate-fade-in">
      <div className="page-header">
        <h1>Word ↔ PDF Converter</h1>
        <p>Convert between PDF and DOCX formats with text extraction and formatting.</p>
      </div>

      <div className="convert-card">
        <div className="conversion-flow">
          <div className="format-box">
            <FileText size={32} />
            <span>PDF</span>
          </div>
          <ArrowRightLeft size={24} className="flow-arrow" />
          <div className="format-box">
            <File size={32} />
            <span>DOCX</span>
          </div>
        </div>

        <div
          className={`upload-area ${file ? "has-file" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.docx"
            hidden
          />

          {file ? (
            <div className="selected-file">
              <FileUp size={32} style={{ color: "var(--primary)" }} />
              <p className="file-name">{file.name}</p>
              <p className="file-detail">
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {direction && (
                  <span className="direction-badge">
                    {direction.icon} {direction.from} → {direction.to}
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="upload-placeholder">
              <FileUp size={40} style={{ opacity: 0.5 }} />
              <p><strong>Click to select a file</strong></p>
              <p className="upload-hint">Supports .pdf and .docx files</p>
            </div>
          )}
        </div>

        {error && (
          <div className="error-alert" style={{ margin: 0 }}>
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleConvert}
          disabled={!file || isConverting}
          style={{ width: "100%", display: "flex", justifyContent: "center", gap: "0.5rem" }}
        >
          {isConverting ? (
            <>
              <Loader2 className="spinner" size={18} /> Converting...
            </>
          ) : (
            <>
              <ArrowRightLeft size={18} /> Convert {direction ? `${direction.from} → ${direction.to}` : "File"}
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="convert-result animate-fade-in">
          <div className="result-icon">✅</div>
          <h3>Conversion Complete!</h3>
          <p>Your file has been converted successfully.</p>
          <a href={result.url} download={result.name} className="btn-primary download-result-btn">
            <Download size={18} /> Download {result.name}
          </a>
        </div>
      )}
    </div>
  );
}
