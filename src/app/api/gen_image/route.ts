import { NextRequest, NextResponse } from "next/server";
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: NextRequest) {
  const { prompt, dimensions, aspectRatio } = await req.json();
  
  // Generate the image first
  const { image } = await generateImage({
    model: openai.image('gpt-image-1'),
    prompt: prompt,
    size: dimensions,
    aspectRatio: aspectRatio,
  });
  
  console.log("Generated image for prompt:", prompt);
  console.log("Image object keys:", Object.keys(image));
  console.log("Image object structure:", JSON.stringify(image, null, 2));

  // Convert image to base64 data URL for analysis
  
  const imageDataUrl = `data:${image.mimeType || 'image/png'};base64,${image.base64}`;
  
  try {
    // Analyze the image using the analyze_image endpoint
    const analyzeResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/analyze_image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: imageDataUrl,
        filename: `generated-${Date.now()}.png`
      })
    });
    
    if (!analyzeResponse.ok) {
      throw new Error('Failed to analyze generated image');
    }
    
    // Consume the streaming response
    const reader = analyzeResponse.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No response body from analyze_image');
    }
    
    let buffer = '';
    let jsonDescription = null;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete messages
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'complete' && data.json) {
              jsonDescription = data.json;
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError);
          }
        }
      }
    }
    
    // Add generation-specific metadata to the JSON
    const finalJsonDescription = jsonDescription ? {
      ...jsonDescription,
      source: "generated",
      prompt_used: prompt,
      image_properties: {
        ...jsonDescription.image_properties,
        dimensions: dimensions,
        aspect_ratio: aspectRatio,
        format: "PNG",
        generated_at: new Date().toISOString()
      }
    } : null;
    
    // Ensure image object has the right structure for the client
    const imageResponse = {
      base64: image.base64,
      mimeType: image.mimeType || 'image/png'
    };
    
    console.log("Final image response structure:", Object.keys(imageResponse));

    return NextResponse.json({ 
      image: imageResponse, 
      json: finalJsonDescription
    });
    
  } catch (error) {
    console.error('Error analyzing generated image:', error);
    
    // Fallback JSON if analysis fails
    const fallbackJson = {
      "analysis": "AI Generated Image",
      "source": "generated",
      "prompt_used": prompt,
      "image_properties": {
        "dimensions": dimensions,
        "aspect_ratio": aspectRatio,
        "format": "PNG",
        "generated_at": new Date().toISOString()
      },
      "description": {
        "style": "AI-generated digital art",
        "content": `Generated from prompt: ${prompt}`,
        "quality": "High resolution"
      },
      "elements": ["AI", "generated", "content"],
      "mood": "Creative",
      "colors": ["varied"]
    };
    
    console.log("Returning fallback response with image keys:", Object.keys(image));
    
    const fallbackImageResponse = {
      base64: image.base64,
      mimeType: image.mimeType || 'image/png'
    };
    
    return NextResponse.json({ 
      image: fallbackImageResponse, 
      json: fallbackJson
    });
  }
}