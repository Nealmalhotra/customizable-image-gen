import { NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  const { imageData, filename } = await req.json();
  
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
    
    // Remove the data URL prefix if it exists
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and create a detailed JSON description. Return ONLY a valid JSON object with this structure:
{
  "analysis": "detailed analysis of the image",
  "source": "imported",
  "filename": "${filename || 'unknown'}",
  "image_elements": [
    {
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
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    let jsonDescription;
    try {
      const responseText = response.choices[0].message.content || '';
      
      // Clean the response text to remove markdown code blocks and extra formatting
      let cleanedText = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json') || cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
      }
      
      // Remove any leading/trailing whitespace
      cleanedText = cleanedText.trim();
      
      // Try to parse the cleaned JSON
      jsonDescription = JSON.parse(cleanedText);
    } catch (parseError) {
      console.log("Error parsing JSON:", parseError);
      console.log("Response text:", response.choices[0].message.content);
      
      // Try to extract JSON from the response using regex
      const responseText = response.choices[0].message.content || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          jsonDescription = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          console.log("Error parsing extracted JSON:", secondParseError);
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
            "content": "Image analysis could not be completed",
            "quality": "Original quality"
          },
          "elements": ["imported", "user", "content"],
          "mood": "User-defined",
          "colors": ["varied"],
          "composition": "User-defined composition"
        };
      }
    }
    
    return NextResponse.json({ json: jsonDescription });
    
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' }, 
      { status: 500 }
    );
  }
} 