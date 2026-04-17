"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import "./SmartDropzone.css";

interface IngestionResult {
  success: boolean;
  noteId: string;
  chunksCount: number;
  embeddedCount: number;
  message: string;
}

interface SmartDropzoneProps {
  onIngestComplete?: () => void;
}

export default function SmartDropzone({ onIngestComplete }: SmartDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<IngestionResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError("");
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    },
    maxFiles: 1,
  });

  const handleProcess = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatusText("Uploading and extracting text...");
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to process file");
      }

      setStatusText("Processing embeddings...");
      const data: IngestionResult = await response.json();

      setResult(data);
      setFile(null);
      onIngestComplete?.();
    } catch (err: any) {
      setError(err.message || "Failed to process file");
    } finally {
      setIsUploading(false);
      setStatusText("");
    }
  };

  return (
    <div className="dropzone-container">
      <div 
        {...getRootProps()} 
        className={`dropzone-area glass-panel ${isDragActive ? "drag-active" : ""}`}
      >
        <input {...getInputProps()} />
        
        {file ? (
          <div className="file-selected">
            <FileText size={48} className="file-icon" />
            <p className="file-name">{file.name}</p>
            <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="dropzone-placeholder">
            <UploadCloud size={48} className="upload-icon" />
            <h3>Drag & drop a file here</h3>
            <p>Or click to select a file (PDF, TXT, PPTX)</p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="success-alert">
          <CheckCircle2 size={18} />
          <div>
            <strong>{result.message}</strong>
            <p className="success-detail">{result.embeddedCount} of {result.chunksCount} chunks embedded for semantic search.</p>
          </div>
        </div>
      )}

      <button 
        className="btn-primary process-btn" 
        onClick={handleProcess}
        disabled={!file || isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="spinner" size={18} />
            {statusText}
          </>
        ) : (
          <>
            <CheckCircle2 size={18} />
            Start Ingestion
          </>
        )}
      </button>
    </div>
  );
}
