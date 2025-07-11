import { NextRequest } from "next/server";
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: NextRequest) {
  const { imageData, filename } = await req.json();
  
  // Remove the data URL prefix if it exists
  const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
  
  try {
    const result = await streamText({
      model: openai('gpt-4.1-mini'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and create a detailed JSON description that includes:
- Analysis of what the image contains
- Technical properties (try to detect dimensions, format, etc.)
- Style description
- Content description
- Quality assessment

IMPORTANT: Return ONLY a valid JSON object. Do NOT wrap it in markdown code blocks or any other formatting. Start your response directly with { and end with }.

Use this structure:
{
  "analysis": "detailed analysis of the image",
  "source": "imported",
  "filename": "${filename || 'unknown'}",
  "image_elements": [
    "element": "name of the element",
    "attributes": {
      "color": "color of the element",
      "shape": "shape of the element",
      "style": "style of the element",
      "size": "size of the element",
      "position": "position of the element",
      "orientation": "orientation of the element",
      "texture": "texture of the element",
      "material": "material of the element"
    }
  ],
  "image_properties": {
    "format": "detected format",
    "estimated_dimensions": "estimated dimensions",
    "import_date": "${new Date().toISOString()}"
  },
  "description": {
    "style": "description of visual style",
    "content": "description of image content", 
    "quality": "quality assessment"
  },
  "elements": ["array", "of", "key", "visual", "elements"],
  "mood": "overall mood/atmosphere",
  "colors": ["dominant", "color", "palette"],
  "composition": "description of composition and layout"
}`
            },
            {
              type: 'image',
              image: `data:image/jpeg;base64,${base64Image}`
            }
          ]
        }
      ],
      temperature: 0.7,
    });

    // Create a streaming response
    const encoder = new TextEncoder();
    let accumulatedText = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));
          
          // Stream the text generation
          for await (const chunk of result.textStream) {
            accumulatedText += chunk;
            
            // Send the chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'chunk', 
              content: chunk,
              accumulated: accumulatedText
            })}\n\n`));
          }
          
          // Try to parse the final JSON
          let jsonDescription;
          try {
            // First try to parse as-is
            jsonDescription = JSON.parse(accumulatedText);
          } catch (parseError) {
            console.log("Error parsing JSON:", parseError);
            
            // Try to extract JSON from markdown code blocks
            let cleanedText = accumulatedText;
            
            // Remove markdown code blocks
            cleanedText = cleanedText.replace(/```json\s*/g, '');
            cleanedText = cleanedText.replace(/```\s*$/g, '');
            cleanedText = cleanedText.replace(/^```\s*/g, '');
            
            // Try to extract JSON object from the cleaned text
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                jsonDescription = JSON.parse(jsonMatch[0]);
              } catch (secondParseError) {
                console.log("Error parsing extracted JSON:", secondParseError);
                // Use fallback
                jsonDescription = null;
              }
            } else {
              jsonDescription = null;
            }
            
            // If still no valid JSON, use fallback
            if (!jsonDescription) {
              jsonDescription = {
                "analysis": "Imported image analysis",
                "source": "imported",
                "filename": filename || "unknown",
                "image_properties": {
                  "format": "Unknown",
                  "estimated_dimensions": "Unknown",
                  "import_date": new Date().toISOString()
                },
                "description": {
                  "style": "User-imported image",
                  "content": accumulatedText.substring(0, 100) + "...",
                  "quality": "Original quality"
                },
                "elements": ["imported", "user", "content"],
                "mood": "User-defined",
                "colors": ["varied"]
              };
            }
          }
          
          // Send the final parsed JSON
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            json: jsonDescription 
          })}\n\n`));
          
          console.log("Successfully analyzed imported image:", filename);
          
        } catch (error) {
          console.error('Error analyzing image:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            message: 'Failed to analyze image' 
          })}\n\n`));
        }
        
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('Error analyzing image:', error);
    return new Response(JSON.stringify({ error: 'Failed to analyze image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 