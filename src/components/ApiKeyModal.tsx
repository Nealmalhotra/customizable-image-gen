"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiKeyModalProps {
  isOpen: boolean;
  onSubmit: (apiKey: string) => void;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onSubmit, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSubmit(apiKey.trim());
      setApiKey("");
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: 12,
        padding: 32,
        maxWidth: 400,
        width: "90%",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            API Key Required
          </h2>
          <p style={{ color: "#666", fontSize: 16 }}>
            Enter your OpenAI API key to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="OpenAI API Key"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ 
              width: "100%", 
              padding: 12, 
              marginBottom: 16,
              fontSize: 16
            }}
            required
            autoFocus
          />
          
          <div style={{ display: "flex", gap: 12 }}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              style={{ flex: 1 }}
            >
              Continue
            </Button>
          </div>
        </form>

        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          backgroundColor: "#f0f8ff", 
          borderRadius: 8,
          fontSize: 14,
          color: "#0066cc"
        }}>
          <strong>💡 Tip:</strong> Your API key is stored locally and never sent to our servers.
        </div>
      </div>
    </div>
  );
} 