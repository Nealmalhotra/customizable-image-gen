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
  const [apiKeyVersion, setApiKeyVersion] = useState(0); // Force re-render when API key changes
  
  // Image and JSON state for passing to editor
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentJson, setCurrentJson] = useState<any>(undefined);
  const [imageSource, setImageSource] = useState<"imported" | "generated">("generated");
  
  // Streaming state
  const [isStreamingJson, setIsStreamingJson] = useState(false);
  const [streamingJsonText, setStreamingJsonText] = useState<string>("");

  const checkApiKey = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const apiKey = localStorage.getItem('openai_api_key');
      return !!apiKey;
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return false;
    }
  };

  const handleApiKeySubmit = (apiKey: string) => {
    try {
      localStorage.setItem('openai_api_key', apiKey);
      setShowApiKeyModal(false);
      setApiKeyVersion(prev => prev + 1); // Force re-render
      
      // Execute the pending action
      if (pendingAction === "import") {
        setStep("import");
      } else if (pendingAction === "generate") {
        handleGenerateImageDirect();
      }
      setPendingAction(null);
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('Failed to save API key. Please try again.');
    }
  };

  const handleApiKeyModalClose = () => {
    setShowApiKeyModal(false);
    setPendingAction(null);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('openai_api_key');
      setCurrentImage(undefined);
      setCurrentJson(undefined);
      setStep("options");
      // Force re-render to update the InitialOptions component
      setApiKeyVersion(prev => prev + 1);
    } catch (error) {
      console.error('Error removing API key:', error);
      alert('Failed to remove API key. Please try again.');
    }
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
    
    // Start JSON analysis (no longer streaming)
    setIsStreamingJson(false);
    setStreamingJsonText("");
    setCurrentJson(undefined);

    try {
      // Get API key from localStorage
      const apiKey = localStorage.getItem('openai_api_key');
      if (!apiKey) {
        throw new Error('No API key found');
      }

      const response = await fetch("/api/analyze_image", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({ imageData, filename }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      
      if (data.json) {
        setCurrentJson(data.json);
      }
      
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
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
          key={apiKeyVersion} // Force re-render when API key changes
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
