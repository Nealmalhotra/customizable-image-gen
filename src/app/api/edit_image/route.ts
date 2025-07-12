import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { jsonDescription, imageData } = await req.json();
    
    // Validate input
    if (!jsonDescription) {
      return NextResponse.json({ error: 'JSON description is required' }, { status: 400 });
    }
    
    if (!imageData) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }
    
    // Get API key from Authorization header
    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required in Authorization header' }, { status: 401 });
    }

    console.log('Starting image editing from JSON...');
    console.log('JSON Description:', typeof jsonDescription === 'string' ? jsonDescription : JSON.stringify(jsonDescription, null, 2));
    
    // Parse JSON if it's a string
    let parsedJson: Record<string, unknown>;
    if (typeof jsonDescription === 'string') {
      try {
        parsedJson = JSON.parse(jsonDescription);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
      }
    } else {
      parsedJson = jsonDescription;
    }
    
    // Create OpenAI client with user-provided API key
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Create a comprehensive prompt directly from the JSON structure
    // const prompt = createPromptFromJson(parsedJson);
    const prompt = "Make edits to this image. Here is a JSON representation of the new image with the edits. Make sure to follow the JSON description exactly. \n " + JSON.stringify(parsedJson, null, 2);
    console.log('Generated prompt:', prompt);
    
    // Convert base64 image data to Buffer
    let imageBuffer: Buffer;
    try {
      // Remove data URL prefix if present (e.g., "data:image/png;base64,")
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
      console.log('Image buffer size:', imageBuffer.length);
    } catch (error) {
      console.error('Error converting image data:', error);
      return NextResponse.json({ error: 'Invalid image data format' }, { status: 400 });
    }
    
    // Convert Buffer to File using toFile helper
    const imageFile = await toFile(imageBuffer, 'image.png', { type: 'image/png' });
    
    // Edit the image using OpenAI API
    console.log('Calling OpenAI image edit...');
    const imageResponse = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: prompt,
    });
    
    const editedImageData = imageResponse.data?.[0];
    
    if (!editedImageData || (!editedImageData.b64_json && !editedImageData.url)) {
      console.error('No image data received:', editedImageData);
      throw new Error('No image data received from OpenAI');
    }
    
    // Get base64 image data
    let base64Image: string | undefined = editedImageData.b64_json;
    if (!base64Image && editedImageData.url) {
      const imgRes = await fetch(editedImageData.url);
      const arrayBuffer = await imgRes.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
    }
    
    if (!base64Image) {
      throw new Error('Failed to obtain base64 image data');
    }
    
    // Return the edited image with the JSON description
    return NextResponse.json({ 
      image: {
        base64: base64Image,
        mimeType: 'image/png'
      },
      json: parsedJson // Return the parsed JSON as the description
    });
    
  } catch (error) {
    console.error('Error editing image from JSON:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to edit image from JSON';
    const statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: errorMessage }, 
      { status: statusCode }
    );
  }
}

// Helper function to create a comprehensive prompt from JSON structure
function createPromptFromJson(json: Record<string, unknown>): string {
  const parts: string[] = [];
  
  // Extract key visual elements directly from JSON structure
  const description = json.description as Record<string, unknown> | undefined;
  if (description?.content && typeof description.content === 'string') {
    parts.push(description.content);
  }
  
  if (description?.style && typeof description.style === 'string') {
    parts.push(`in ${description.style} style`);
  }
  
  if (json.elements && Array.isArray(json.elements) && json.elements.length > 0) {
    parts.push(`featuring ${json.elements.join(', ')}`);
  }
  
  if (json.colors && Array.isArray(json.colors) && json.colors.length > 0) {
    parts.push(`with ${json.colors.join(', ')} colors`);
  }
  
  if (json.mood && typeof json.mood === 'string') {
    parts.push(`${json.mood} mood`);
  }
  
  if (json.composition && typeof json.composition === 'string') {
    parts.push(`${json.composition} composition`);
  }
  
  if (description?.quality && typeof description.quality === 'string') {
    parts.push(`${description.quality}`);
  }
  
  // Add any specific properties
  const imageProperties = json.image_properties as Record<string, unknown> | undefined;
  if (imageProperties?.dimensions && typeof imageProperties.dimensions === 'string') {
    parts.push(`${imageProperties.dimensions} resolution`);
  }
  
  // Fallback if no recognizable structure
  if (parts.length === 0) {
    return JSON.stringify(json);
  }
  
  return parts.join(', ');
} 