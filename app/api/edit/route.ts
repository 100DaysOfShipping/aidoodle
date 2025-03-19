import { NextRequest, NextResponse } from 'next/server';
// import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

import fs from 'fs';
import path from 'path';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { image, command } = body;

    if (!image || !command) {
      return NextResponse.json(
        { error: 'Image and command are required' },
        { status: 400 }
      );
    }

    // Extract base64 data from the data URL
    const base64Image = image.split(',')[1];

    // Prepare the content parts for the API request
    const contents = [
      { text: command },
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Image
        }
      }
    ];

    // Set up the model with image generation capability
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig: {
        responseModalities: ['Text', 'Image']
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, 
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
          threshold: HarmBlockThreshold.BLOCK_NONE
        }
      ],
    });

    // Generate content
    const response = await model.generateContent(contents);
    
    let editedImage = null;
    let responseText = null;
    let savedFilePath = null;

    // Process the response
    for (const part of response.response.candidates[0].content.parts) {
      if (part.text) {
        responseText = part.text;
      } else if (part.inlineData) {
        // Convert the base64 data to a data URL for response
        editedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        
        // Save the image locally
        try {
          // Create a unique filename with timestamp
          const timestamp = new Date().getTime();
          const filename = `edited_image_${timestamp}.png`;
          
          // Define the directory path (same as the API route)
          const dirPath = path.join(process.cwd(), 'app/api/edit');
          
          // Ensure the directory exists
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          
          // Define the full file path
          const filePath = path.join(dirPath, filename);
          
          // Convert base64 to buffer and write to file
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          fs.writeFileSync(filePath, buffer);
          
          savedFilePath = filePath;
          console.log(`Image saved locally at: ${savedFilePath}`);
        } catch (saveError) {
          console.error('Error saving image locally:', saveError);
        }
      }
    }

    // Return the edited image, text response, and saved file path
    return NextResponse.json({
      editedImage,
      responseText,
      savedFilePath
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
