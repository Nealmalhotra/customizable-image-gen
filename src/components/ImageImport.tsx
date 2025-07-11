"use client";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ImageImportProps {
  onImageImport: (imageData: string, filename: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ImageImport({ onImageImport, onCancel, loading = false }: ImageImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  }, []);

  const handleFileSelection = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewImage(result);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (previewImage && selectedFile) {
      onImageImport(previewImage, selectedFile.name);
    }
  };

  const handleReset = () => {
    setPreviewImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Import Image</h2>
        <p style={{ color: "#666", fontSize: 16 }}>
          Upload an image to analyze and generate a JSON description
        </p>
      </div>

      {!previewImage ? (
        <div
          style={{
            border: dragActive ? "2px dashed #007bff" : "2px dashed #ddd",
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
            backgroundColor: dragActive ? "#f0f8ff" : "#fafafa",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Drop your image here or click to browse
          </h3>
          <p style={{ color: "#666", fontSize: 14 }}>
            Supports JPG, PNG, GIF, WebP formats
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div style={{ 
          border: "1px solid #ddd", 
          borderRadius: 12, 
          padding: 24, 
          textAlign: "center",
          backgroundColor: "#fff"
        }}>
          <Image
            src={previewImage}
            alt="Preview"
            style={{
              maxWidth: "100%",
              maxHeight: 400,
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              marginBottom: 16
            }}
          />
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>
              {selectedFile?.name}
            </p>
            <p style={{ color: "#666", fontSize: 14 }}>
              {selectedFile && `${Math.round(selectedFile.size / 1024)} KB`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={loading}
            >
              Choose Different Image
            </Button>
            <Button 
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Import & Analyze"}
            </Button>
          </div>
        </div>
      )}

      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        marginTop: 24,
        paddingTop: 24,
        borderTop: "1px solid #eee"
      }}>
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
        >
          Back to Options
        </Button>
      </div>
    </div>
  );
} 