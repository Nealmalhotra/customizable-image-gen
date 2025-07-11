import { NextRequest, NextResponse } from "next/server";
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: NextRequest) {
  const { json, dimensions, aspectRatio } = await req.json();
  
  // Convert JSON description to a natural language prompt
  const prompt = `Generate an image based on this JSON description: ${JSON.stringify(json)}. Create a detailed visual representation that captures all the elements, style, mood, and composition described in the JSON.`;
  
  const { image } = await generateImage({
    model: openai.image('gpt-image-1'),
    prompt: prompt,
    size: dimensions,
    aspectRatio: aspectRatio,
  });
  
  console.log("Generated image from JSON");

  return NextResponse.json({ 
    image: image,
    originalJson: json,
    promptUsed: prompt
  });
} 