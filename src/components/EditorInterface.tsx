"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const aspectRatio = "1:1";
  const [size, setSize] = useState("1024x1024");
  const [editableJson, setEditableJson] = useState<string>("");
  const [isJsonEdited, setIsJsonEdited] = useState(false);


  // Helper function to get API key and create headers
  const getAuthHeaders = () => {
    try {
      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        throw new Error('No API key found');
      }
      return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      };
    } catch (error) {
      console.error('Error getting API key:', error);
      throw new Error('Failed to get API key');
    }
  };

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

      const headers = getAuthHeaders();

      const res = await fetch("/api/gen_image", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ 
          prompt,
          dimensions: size,
          aspectRatio: aspectRatio,
          stream: false
        }),
      });

      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.image?.base64) {
        const imageUrl = `data:${data.image.mimeType || 'image/png'};base64,${data.image.base64}`;
        setImage(imageUrl);
      }
      
      if (data.json) {
        const jsonString = JSON.stringify(data.json, null, 2);
        setJsonResponse(jsonString);
        setEditableJson(jsonString);
      }
      
    } catch (error) {
      console.error('Error generating image:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        alert('API key error. Please check your API key and try again.');
        onLogout();
      } else {
        alert('Failed to generate image. Please try again.');
      }
    } finally {
      setGeneratingImage(false);
    }
  };



  const handleUpdateJson = async () => {
    if (!editableJson.trim() || !image) return;
    
    setLoading(true);
    setIsJsonEdited(false);
    
    try {
      // Send JSON as text directly to edit_image endpoint
      const headers = getAuthHeaders();
      const res = await fetch("/api/edit_image", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ 
          imageData: image,
          jsonDescription: editableJson
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.image?.base64) {
        const imageUrl = `data:${data.image.mimeType || 'image/png'};base64,${data.image.base64}`;
        setImage(imageUrl);
        setJsonResponse(editableJson);
        setMessages(msgs => [...msgs, { 
          role: "system", 
          content: `Generated new image from updated JSON description` 
        }]);
      } else {
        throw new Error('No image data received from server');
      }
    } catch (error) {
      console.error('Error updating JSON:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        alert('API key error. Please check your API key and try again.');
        onLogout();
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to generate image from JSON: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditImageWithJson = async (jsonDescription: string) => {
    if (!image) return;
    
    try {
      setLoading(true);
      
      const headers = getAuthHeaders();
      const res = await fetch("/api/edit_image", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ 
          imageData: image,
          jsonDescription: jsonDescription
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.image?.base64) {
        const imageUrl = `data:${data.image.mimeType || 'image/png'};base64,${data.image.base64}`;
        setImage(imageUrl);
        
        if (data.json) {
          const jsonString = JSON.stringify(data.json, null, 2);
          setJsonResponse(jsonString);
          setEditableJson(jsonString);
        }
        
        setMessages(msgs => [...msgs, { 
          role: "system", 
          content: `Image edited based on JSON description` 
        }]);
      } else {
        throw new Error('No image data received from server');
      }
    } catch (error) {
      console.error('Error editing image with JSON:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        alert('API key error. Please check your API key and try again.');
        onLogout();
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to edit image: ${errorMessage}`);
        setMessages(msgs => [...msgs, { 
          role: "system", 
          content: `Sorry, I encountered an error editing the image: ${errorMessage}` 
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateJsonFromInstruction = async (instruction: string): Promise<string | null> => {
    try {
      const baseJson = jsonResponse || JSON.stringify({
        "analysis": "Image modification request",
        "description": {
          "style": "photorealistic",
          "content": "base image",
          "quality": "high resolution"
        },
        "elements": [],
        "mood": "neutral",
        "colors": [],
        "composition": "centered"
      }, null, 2);

      // Use OpenAI API directly to generate JSON
      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        throw new Error('No API key found');
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert at creating JSON descriptions for images. Given a user instruction and current image state, generate a complete JSON description that incorporates the requested changes. Return ONLY valid JSON, no additional text. Make sure the JSON is complete and properly formatted."
            },
            {
              role: "user",
              content: `Current image JSON: ${baseJson}\n\nUser instruction: "${instruction}"\n\nGenerate an updated JSON description that incorporates the user's requested changes. Make sure to return complete, valid JSON:`
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (response.ok) {
        const result = await response.json();
        const jsonText = result.choices[0].message.content || '';
        
        // Clean the response text to remove markdown code blocks
        let cleanedText = jsonText.trim();
        if (cleanedText.startsWith('```json') || cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
        }
        cleanedText = cleanedText.trim();
        
        // Validate the JSON before returning
        try {
          JSON.parse(cleanedText);
          return cleanedText;
        } catch (parseError) {
          console.error('Generated JSON is invalid:', parseError);
          console.error('Invalid JSON:', cleanedText);
          throw new Error('Generated JSON is malformed');
        }
      } else {
        throw new Error('Failed to generate JSON from instruction');
      }
    } catch (error) {
      console.error('Error generating JSON from instruction:', error);
      return null;
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
    setMessages(msgs => [...msgs, { role: "user", content: userMessage }]);
    
    try {
      if (image) {
        // If we have an image, generate JSON from instruction and edit the image
        setMessages(msgs => [...msgs, { role: "system", content: "Generating updated JSON description..." }]);
        
        const jsonDescription = await generateJsonFromInstruction(userMessage);
        if (jsonDescription) {
          setMessages(msgs => [...msgs, { role: "system", content: "JSON updated, generating new image..." }]);
          await handleEditImageWithJson(jsonDescription);
        } else {
          throw new Error('Failed to generate JSON from instruction');
        }
      } else {
        // No image, generate new image
        await handleGenerateImage(userMessage);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessages(msgs => [...msgs, { 
        role: "system", 
        content: `Sorry, I encountered an error: ${errorMessage}` 
      }]);
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
            {(() => {
              const [w, h] = size.split("x").map(n => parseInt(n, 10));
              const width = isNaN(w) ? 1024 : w;
              const height = isNaN(h) ? 1024 : h;
              return (
                <Image
                  src={image}
                  alt="Generated"
                  width={width}
                  height={height}
                  unoptimized
                  style={{
                    maxWidth: "100%",
                    maxHeight: 500,
                    borderRadius: 8,
                    boxShadow: "0 2px 8px #0001"
                  }}
                />
              );
            })()}
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
      
      {/* Right Column: JSON (large), Chat, Settings */}
      <div style={{ width: 450, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* JSON Card */}
        <div style={{ 
          background: "#fff", 
          border: "1px solid #eee", 
          borderRadius: 8, 
          overflow: "hidden",
          flex: 2,
          minHeight: 400
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
            height: 400, 
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
                resize: "vertical",
                outline: "none",
                cursor: isStreamingJson ? "default" : "text"
              }}
            />
          </div>
        </div>

        {/* Agent Card */}
        <div style={{ 
          background: "#fff", 
          border: "1px solid #eee", 
          borderRadius: 8, 
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          maxHeight: 400
        }}>
          <div style={{ padding: 16, borderBottom: "1px solid #eee", background: "#f8f9fa" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>🤖 Agent</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#666" }}>
              {image ? "Edit current image" : "Generate new image"}
            </p>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {messages.length === 0 && (
              <div style={{ color: "#bbb", fontSize: 14 }}>
                {image 
                  ? "Describe changes to make to the current image"
                  : "Describe the image you want to generate"}
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
            <Textarea
              placeholder={image ? "Describe changes to make..." : "Describe your image..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{ flex: 1, minHeight: 80, resize: "vertical" }}
              disabled={loading || generatingImage}
              rows={4}
            />
            <Button type="submit" disabled={loading || generatingImage || !input.trim()}>
              {loading ? "..." : generatingImage ? "Generating..." : image ? "Edit" : "Generate"}
            </Button>
          </form>
        </div>

        {/* Settings Card (Size only) */}
        <div style={{ 
          background: "#fff", 
          border: "1px solid #eee", 
          borderRadius: 8, 
          overflow: "hidden",
          maxHeight: 180
        }}>
          <div style={{ padding: 16, borderBottom: "1px solid #eee", background: "#f8f9fa" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>📐 Size</h3>
          </div>
          <div style={{ padding: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Select Image Size
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
    </div>
  );
}
