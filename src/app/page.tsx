"use client";
import { useState } from "react";
import EditorInterface from "@/components/EditorInterface";
import InitialOptions from "@/components/InitialOptions";
import ImageImport from "@/components/ImageImport";
import ApiKeyModal from "@/components/ApiKeyModal";

type AppStep = "options" | "import" | "editor";

export default function Home() {
  const [step, setStep] = useState<AppStep>("options");
  const [loading, setLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"import" | "generate" | null>(null);
  
  // Image and JSON state for passing to editor
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentJson, setCurrentJson] = useState<any>(undefined);
  const [imageSource, setImageSource] = useState<"imported" | "generated">("generated");
  
  // Streaming state
  const [isStreamingJson, setIsStreamingJson] = useState(false);
  const [streamingJsonText, setStreamingJsonText] = useState<string>("");

  const checkApiKey = (): boolean => {
    const apiKey = localStorage.getItem('openai_api_key');
    return !!apiKey;
  };

  const handleApiKeySubmit = (apiKey: string) => {
    localStorage.setItem('openai_api_key', apiKey);
    setShowApiKeyModal(false);
    
    // Execute the pending action
    if (pendingAction === "import") {
      setStep("import");
    } else if (pendingAction === "generate") {
      handleGenerateImageDirect();
    }
    setPendingAction(null);
  };

  const handleApiKeyModalClose = () => {
    setShowApiKeyModal(false);
    setPendingAction(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('openai_api_key');
    setCurrentImage(undefined);
    setCurrentJson(undefined);
    setStep("options");
  };

  const handleImportImage = () => {
    if (checkApiKey()) {
      setStep("import");
    } else {
      setPendingAction("import");
      setShowApiKeyModal(true);
    }
  };

  const handleGenerateImage = () => {
    if (checkApiKey()) {
      handleGenerateImageDirect();
    } else {
      setPendingAction("generate");
      setShowApiKeyModal(true);
    }
  };

  const handleGenerateImageDirect = () => {
    setCurrentImage(undefined);
    setCurrentJson(undefined);
    setImageSource("generated");
    setStep("editor");
  };

  const handleImageImported = async (imageData: string, filename: string) => {
    setLoading(true);
    
    // Set the image immediately and go to editor
    setCurrentImage(imageData);
    setImageSource("imported");
    setStep("editor");
    setLoading(false);
    
    // Start streaming JSON analysis
    setIsStreamingJson(true);
    setStreamingJsonText("");
    setCurrentJson(undefined);

    try {
      const response = await fetch("/api/analyze_image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, filename }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk') {
                setStreamingJsonText(data.accumulated);
              } else if (data.type === 'complete' && data.json) {
                setCurrentJson(data.json);
                setIsStreamingJson(false);
                setStreamingJsonText("");
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      setIsStreamingJson(false);
      setStreamingJsonText("");
      alert("Failed to analyze image. Please try again.");
    }
  };

  const handleBackToOptions = () => {
    setCurrentImage(undefined);
    setCurrentJson(undefined);
    setStep("options");
  };

  const handleCancelImport = () => {
    setStep("options");
  };

  // Initial Options (Default)
  if (step === "options") {
    return (
      <>
        <InitialOptions
          onImportImage={handleImportImage}
          onGenerateImage={handleGenerateImage}
          onLogout={handleLogout}
        />
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onSubmit={handleApiKeySubmit}
          onClose={handleApiKeyModalClose}
        />
      </>
    );
  }

  // Import Image
  if (step === "import") {
    return (
      <ImageImport
        onImageImport={handleImageImported}
        onCancel={handleCancelImport}
        loading={loading}
      />
    );
  }

  // Editor Interface
  return (
    <EditorInterface
      onLogout={handleLogout}
      onBackToOptions={handleBackToOptions}
      initialImage={currentImage}
      initialJson={currentJson}
      imageSource={imageSource}
      isStreamingJson={isStreamingJson}
      streamingJsonText={streamingJsonText}
    />
  );
}
