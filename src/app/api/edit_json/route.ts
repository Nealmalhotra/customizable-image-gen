import { NextRequest, NextResponse } from "next/server";
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: NextRequest) {
  const { currentJson, instruction } = await req.json();
  
  const systemPrompt = `You are an expert at editing JSON descriptions for image generation. Given a JSON object describing an image and a natural language instruction, modify the JSON to reflect the requested changes. Return ONLY the modified JSON object, no additional text or explanation.

Current JSON: ${JSON.stringify(currentJson, null, 2)}

User instruction: ${instruction}

Return the updated JSON that incorporates the user's requested changes:`;

  try {
    const { text } = await generateText({
      model: openai('gpt-4.1-mini'),
      prompt: systemPrompt,
      temperature: 0.3,
    });
    
    let updatedJson;
    try {
      updatedJson = JSON.parse(text);
    } catch (parseError) {
      console.log("Error parsing JSON:", parseError);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        updatedJson = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract valid JSON from response');
      }
    }
    
    console.log("Successfully edited JSON with instruction:", instruction);
    
    return NextResponse.json({ 
      updatedJson,
      instruction,
      originalJson: currentJson
    });
    
  } catch (error) {
    console.error('Error editing JSON:', error);
    return NextResponse.json(
      { error: 'Failed to edit JSON description' }, 
      { status: 500 }
    );
  }
} 