"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

interface Message {
  role: "user" | "system";
  content: string;
}

interface EditorInterfaceProps {
  onLogout: () => void;
  onBackToOptions: () => void;
  initialImage?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialJson?: Record<string, any>;
  imageSource?: "imported" | "generated";
  isStreamingJson?: boolean;
  streamingJsonText?: string;
}

export default function EditorInterface({ 
  onLogout, 
  onBackToOptions, 
  initialImage, 
  initialJson, 
  imageSource = "generated",
  isStreamingJson = false,
  streamingJsonText = ""
}: EditorInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [jsonResponse, setJsonResponse] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [size, setSize] = useState("1024x1024");
  const [editableJson, setEditableJson] = useState<string>("");
  const [isJsonEdited, setIsJsonEdited] = useState(false);

  // Initialize with passed data
  useEffect(() => {
    if (initialImage) {
      setImage(initialImage);
    }
    if (initialJson) {
      const jsonString = JSON.stringify(initialJson, null, 2);
      setJsonResponse(jsonString);
      setEditableJson(jsonString);
      
      // Add a system message about the imported image
      if (imageSource === "imported") {
        setMessages([{
          role: "system",
          content: `Imported image analyzed and JSON description generated. You can now edit the JSON or ask me to modify it.`
        }]);
      }
    }
  }, [initialImage, initialJson, imageSource]);



  const handleGenerateImage = async (prompt: string) => {
    if (!prompt.trim()) return;
    
    try {
      setGeneratingImage(true);
      setJsonResponse("");
      setEditableJson("");
      setIsJsonEdited(false);

      const res = await fetch("/api/gen_image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt,
          dimensions: size,
          aspectRatio: aspectRatio
        }),
      });

      const data = await res.json();
      
      // Set the image
      console.log("Received data:", data);
      console.log("Image object:", data.image);
      
      if (data.image?.base64) {
        const imageUrl = `data:${data.image.mimeType || 'image/png'};base64,${data.image.base64}`;
        console.log("Setting image with URL length:", imageUrl.length);
        setImage(imageUrl);
      } else if (data.image?.url) {
        // Handle URL-based images
        console.log("Setting image with URL:", data.image.url);
        setImage(data.image.url);
      } else if (data.image?.base64Data) {
        // Handle base64Data property
        const imageUrl = `data:${data.image.mimeType || 'image/png'};base64,${data.image.base64Data}`;
        console.log("Setting image with base64Data, URL length:", imageUrl.length);
        setImage(imageUrl);
      } else {
        console.error("No image data received:", data);
        console.error("Image object keys:", data.image ? Object.keys(data.image) : "no image object");
      }

      // Set the JSON
      if (data.json) {
        const jsonString = JSON.stringify(data.json, null, 2);
        setJsonResponse(jsonString);
        setEditableJson(jsonString);
      }
    } catch {
      throw new Error("Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleUpdateJson = async () => {
    if (!editableJson.trim()) return;
    
    setLoading(true);
    setIsJsonEdited(false);
    
    try {
      // Parse the JSON to validate it
      const parsedJson = JSON.parse(editableJson);
      
      // Send to gen_from_json endpoint
      const res = await fetch("/api/gen_from_json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          json: parsedJson,
          dimensions: size,
          aspectRatio: aspectRatio
        }),
      });
      
      const data = await res.json();
      
      if (data.image?.base64Data) {
        setImage(`data:image/png;base64,${data.image.base64Data}`);
        setJsonResponse(editableJson);
        setMessages(msgs => [...msgs, { 
          role: "system", 
          content: `Generated new image from updated JSON description` 
        }]);
      }
    } catch {
      alert("Failed to generate image from JSON. Please check the JSON format.");
    } finally {
      setLoading(false);
    }
  };

  const handleJsonEdit = (value: string) => {
    setEditableJson(value);
    setIsJsonEdited(value !== jsonResponse);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setInput("");
    setLoading(true);
    setMessages(msgs => [...msgs, { role: "user", content: userMessage }]);
    
    try {
      // If we have existing JSON, treat this as an edit request
      if (jsonResponse && editableJson) {
        // Step 1: Edit the JSON using LLM
        const editRes = await fetch("/api/edit_json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            currentJson: JSON.parse(editableJson),
            instruction: userMessage
          }),
        });
        
        const editData = await editRes.json();
        
        if (editData.updatedJson) {
          // Update the JSON in the UI
          const newJsonString = JSON.stringify(editData.updatedJson, null, 2);
          setEditableJson(newJsonString);
          setJsonResponse(newJsonString);
          
          // Step 2: Generate new image from updated JSON
          const genRes = await fetch("/api/gen_from_json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              json: editData.updatedJson,
              dimensions: size,
              aspectRatio: aspectRatio
            }),
          });
          
          const genData = await genRes.json();
          
          if (genData.image?.base64Data) {
            setImage(`data:image/png;base64,${genData.image.base64Data}`);
            setMessages(msgs => [...msgs, { 
              role: "system", 
              content: `Updated JSON and generated new image based on your request` 
            }]);
          }
        }
      } else {
        // No existing JSON, generate new image from scratch
        handleGenerateImage(userMessage);
      }
    } catch {
      alert("Failed to process your request. Please try again.");
      setMessages(msgs => [...msgs, { 
        role: "system", 
        content: "Sorry, I encountered an error processing your request." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (image) {
      const link = document.createElement('a');
      link.download = `generated-image-${Date.now()}.png`;
      link.href = image;
      link.click();
    }
  };

  return (
    <div style={{ display: "flex", maxWidth: 1400, margin: "2rem auto", minHeight: "calc(100vh - 4rem)", gap: 16 }}>
      {/* Left: Image */}
      <div style={{ 
        flex: 1, 
        background: "#fafafa", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        padding: 24, 
        borderRadius: 8,
        border: "1px solid #eee"
      }}>
{generatingImage ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              width: 200,
              height: 200,
              borderRadius: 8,
              backgroundColor: "#f0f0f0",
              border: "2px dashed #ccc"
            }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                border: "4px solid #f3f3f3",
                borderTop: "4px solid #3498db",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }}></div>
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "#666" }}>Generating image...</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#999" }}>This may take a few moments</p>
            </div>
          </div>
        ) : image ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Image src={image} alt="Generated" style={{ maxWidth: "100%", maxHeight: 500, borderRadius: 8, boxShadow: "0 2px 8px #0001" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" onClick={handleDownload}>Download</Button>
              <Button variant="outline" onClick={onBackToOptions}>New Session</Button>
              <Button variant="outline" onClick={onLogout}>Change API Key</Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#bbb" }}>
            <h3>No image yet</h3>
            <p>Use the Agent chat to generate your first image</p>
          </div>
        )}
      </div>
      
      {/* Right: Three Cards */}
      <div style={{ width: 400, display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* Agent Card */}
        <div style={{ 
          background: "#fff", 
          border: "1px solid #eee", 
          borderRadius: 8, 
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: 400
        }}>
          <div style={{ padding: 16, borderBottom: "1px solid #eee", background: "#f8f9fa" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>🤖 Agent</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#666" }}>
              {imageSource === "imported" ? "Modify imported image" : "Generate and edit images"}
            </p>
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {messages.length === 0 && (
              <div style={{ color: "#bbb", fontSize: 14 }}>
                {imageSource === "imported" 
                  ? "Your image has been analyzed. Ask me to modify it!"
                  : "No messages yet"
                }
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 12, textAlign: msg.role === "user" ? "right" : "left" }}>
                <div style={{ 
                  display: "inline-block", 
                  background: msg.role === "user" ? "#e0e7ff" : "#f3f4f6", 
                  padding: "8px 12px", 
                  borderRadius: 6, 
                  maxWidth: 280,
                  wordWrap: "break-word",
                  fontSize: 14
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          
          <form
            onSubmit={handleSendMessage}
            style={{ display: "flex", gap: 8, padding: 16, borderTop: "1px solid #eee" }}
          >
            <Input
              placeholder={jsonResponse ? "Describe changes to make..." : "Describe your image..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{ flex: 1 }}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || generatingImage || !input.trim()}>
              {loading ? "..." : generatingImage ? "Generating..." : "Send"}
            </Button>
          </form>
        </div>

        {/* Settings Card */}
        <div style={{ 
          background: "#fff", 
          border: "1px solid #eee", 
          borderRadius: 8, 
          overflow: "hidden"
        }}>
          <div style={{ padding: 16, borderBottom: "1px solid #eee", background: "#f8f9fa" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>⚙️ Settings</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#666" }}>Aspect ratio and size</p>
          </div>
          
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Aspect Ratio
              </label>
              <select 
                value={aspectRatio} 
                onChange={e => setAspectRatio(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "8px 12px", 
                  border: "1px solid #ddd", 
                  borderRadius: 6,
                  fontSize: 14
                }}
              >
                <option value="1:1">Square (1:1)</option>
                <option value="16:9">Landscape (16:9)</option>
                <option value="9:16">Portrait (9:16)</option>
                <option value="4:3">Classic (4:3)</option>
                <option value="3:4">Portrait (3:4)</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Size
              </label>
              <select 
                value={size} 
                onChange={e => setSize(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "8px 12px", 
                  border: "1px solid #ddd", 
                  borderRadius: 6,
                  fontSize: 14
                }}
              >
                <option value="512x512">512x512</option>
                <option value="1024x1024">1024x1024</option>
                <option value="1536x1536">1536x1536</option>
                <option value="1920x1080">1920x1080</option>
              </select>
            </div>
          </div>
        </div>

        {/* JSON Card */}
        <div style={{ 
          background: "#fff", 
          border: "1px solid #eee", 
          borderRadius: 8, 
          overflow: "hidden",
          flex: 1,
          minHeight: 300
        }}>
          <div style={{ padding: 16, borderBottom: "1px solid #eee", background: "#f8f9fa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>📄 JSON Description</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#666" }}>
                {isStreamingJson ? "Streaming..." : editableJson ? "Ready to edit" : "No data yet"}
              </p>
            </div>
            <Button variant="outline" onClick={handleUpdateJson} disabled={!isJsonEdited || loading}>
              {loading ? "..." : "Update"}
            </Button>
          </div>
          <div style={{ 
            padding: 16, 
            height: 240, 
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: 12,
            background: "#f8f9fa"
          }}>
            <textarea
              value={isStreamingJson ? streamingJsonText : editableJson}
              onChange={e => handleJsonEdit(e.target.value)}
              placeholder={isStreamingJson || editableJson ? "" : "JSON description will appear here..."}
              readOnly={isStreamingJson}
              style={{ 
                width: "100%", 
                height: "100%", 
                border: "none", 
                background: "transparent", 
                fontFamily: "monospace",
                fontSize: 12,
                resize: "none",
                outline: "none",
                cursor: isStreamingJson ? "default" : "text"
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
