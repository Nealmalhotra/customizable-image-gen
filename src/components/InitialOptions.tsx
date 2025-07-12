"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface InitialOptionsProps {
  onImportImage: () => void;
  onGenerateImage: () => void;
  onLogout: () => void;
}

export default function InitialOptions({ onImportImage, onGenerateImage, onLogout }: InitialOptionsProps) {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const apiKey = localStorage.getItem('openai_api_key');
      setHasApiKey(!!apiKey);
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      setHasApiKey(false);
    }
  }, []);

  // Listen for storage changes to update the API key state
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const apiKey = localStorage.getItem('openai_api_key');
        setHasApiKey(!!apiKey);
      } catch (error) {
        console.error('Error accessing localStorage:', error);
        setHasApiKey(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
          AI Image Generator
        </h1>
        <p style={{ color: "#666", fontSize: 18 }}>
          Choose how you want to get started
        </p>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: 32,
        marginBottom: 48
      }}>
        {/* Import Image Option */}
        <div style={{
          border: "2px solid #eee",
          borderRadius: 16,
          padding: 32,
          textAlign: "center",
          backgroundColor: "#fff",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}
        onClick={onImportImage}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#007bff";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#eee";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
        }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>📁</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            Import Image
          </h3>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Upload an existing image to analyze and generate a JSON description. 
            Perfect for understanding and recreating existing visuals.
          </p>
          <Button 
            style={{ width: "100%" }}
            onClick={(e) => {
              e.stopPropagation();
              onImportImage();
            }}
          >
            Choose Image
          </Button>
        </div>

        {/* Generate Image Option */}
        <div style={{
          border: "2px solid #eee",
          borderRadius: 16,
          padding: 32,
          textAlign: "center",
          backgroundColor: "#fff",
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}
        onClick={onGenerateImage}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#28a745";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#eee";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
        }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎨</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            Generate Image
          </h3>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Create a new image from scratch using AI. Describe what you want 
            and watch your ideas come to life.
          </p>
          <Button 
            style={{ width: "100%" }}
            onClick={(e) => {
              e.stopPropagation();
              onGenerateImage();
            }}
          >
            Start Creating
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ 
        backgroundColor: "#f8f9fa", 
        borderRadius: 12, 
        padding: 24,
        marginBottom: 32
      }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, textAlign: "center" }}>
          What you can do next:
        </h4>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: 16,
          fontSize: 14,
          color: "#666"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>📝</span>
            <span>View generated JSON description</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>✏️</span>
            <span>Edit JSON directly</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>🤖</span>
            <span>Ask AI to modify the image</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>🔄</span>
            <span>Generate new images from JSON</span>
          </div>
        </div>
      </div>

      {/* Remove API Key button - only show if user has an API key and client is ready */}
      {isClient && hasApiKey && (
        <div style={{ textAlign: "center" }}>
          <Button 
            variant="outline" 
            onClick={onLogout}
            style={{ fontSize: 14 }}
          >
            Remove API Key
          </Button>
        </div>
      )}
    </div>
  );
} 