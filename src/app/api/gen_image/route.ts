import { NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';
import { Buffer } from 'node:buffer';



export async function POST(req: NextRequest) {
  const { prompt, dimensions, aspectRatio, stream = false } = await req.json();
  
  // Get API key from Authorization header
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is required in Authorization header' }, { status: 401 });
  }
  
  try {
    // Create OpenAI client with user-provided API key
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    if (stream) {
      // For now, fall back to non-streaming mode since OpenAI Responses API may not be available
      // TODO: Implement proper streaming when OpenAI Responses API is stable
      console.log('Streaming requested but falling back to non-streaming mode');
    }
    
    // Generate image using standard OpenAI API
    const imageResponse = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: dimensions
      });
      
      const imageData = imageResponse.data?.[0];
      
      if (!imageData || (!imageData.b64_json && !imageData.url)) {
        console.error('No image data received:', imageData);
        throw new Error('No image data received from OpenAI');
      }

      // If only URL is returned (edge-case), fetch it and convert to base64 so the rest of the pipeline stays the same
      let base64Image: string | undefined = imageData.b64_json;
      if (!base64Image && imageData.url) {
        const imgRes = await fetch(imageData.url);
        const arrayBuffer = await imgRes.arrayBuffer();
        base64Image = Buffer.from(arrayBuffer).toString('base64');
      }

      if (!base64Image) {
        throw new Error('Failed to obtain base64 image data');
      }

      // Use the analyze_image endpoint to analyze the generated image
      const analyzeResponse = await fetch(new URL('/api/analyze_image', req.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          imageData: `data:image/png;base64,${base64Image}`,
          filename: `generated_${Date.now()}.png`
        })
      });

      let jsonDescription;
      if (analyzeResponse.ok) {
        const analyzeResult = await analyzeResponse.json();
        jsonDescription = analyzeResult.json;
        
        // Update the analysis to reflect it's a generated image
        if (jsonDescription) {
          jsonDescription.source = "generated";
          jsonDescription.prompt_used = prompt;
          jsonDescription.image_properties = {
            ...jsonDescription.image_properties,
            dimensions: dimensions,
            aspect_ratio: aspectRatio,
            format: "PNG",
            generated_at: new Date().toISOString()
          };
        }
      } else {
        // Fallback JSON if analysis fails
        jsonDescription = {
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
          "colors": ["varied"],
          "composition": "AI-generated composition"
        };
      }
      
      return NextResponse.json({ 
        image: {
          base64: base64Image,
          mimeType: 'image/png'
        },
        json: jsonDescription
      });
    
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' }, 
      { status: 500 }
    );
  }
}