import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize the Google Gen AI client with your API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Define the model ID for Gemini 2.0 Flash experimental
const MODEL_ID = "gemini-2.0-flash-exp";


export async function POST(req: NextRequest) {
  try {
    // Parse JSON request instead of FormDat
    const body = await req.json();
    const { image: inputImage, command: prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get the model with the correct configuration
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        // @ts-expect-error - Gemini API JS is missing this type
        responseModalities: ["Text", "Image"],
      },
      // Add safety settings to disable content filtering
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

    let result;

    try {
      // Create a chat session with the formatted history
      const chat = model.startChat({
      });

      // Prepare the current message parts
      const messageParts = [];

      // Add the text prompt
      messageParts.push({ text: prompt });

      // Add the image if provided
      if (inputImage) {
        // For image editing
        console.log("Processing image edit request");

        // Check if the image is a valid data URL
        if (!inputImage.startsWith("data:")) {
          throw new Error("Invalid image data URL format");
        }

        const imageParts = inputImage.split(",");
        if (imageParts.length < 2) {
          throw new Error("Invalid image data URL format");
        }

        const base64Image = imageParts[1];
        const mimeType = inputImage.includes("image/png")
          ? "image/png"
          : "image/jpeg";
        console.log(
          "Base64 image length:",
          base64Image.length,
          "MIME type:",
          mimeType
        );

        // Add the image to message parts
        messageParts.push({
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        });
      }

      // Send the message to the chat
      console.log("Sending message with", messageParts.length, "parts");
      result = await chat.sendMessage(messageParts);
    } catch (error) {
      console.error("Error in chat.sendMessage:", error);
      throw error;
    }

    const response = result.response;

    let textResponse = null;
    let imageData = null;
    let mimeType = "image/png";

    // Process the response
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      console.log("Number of parts in response:", parts.length);

      for (const part of parts) {
        if ("inlineData" in part && part.inlineData) {
          // Get the image data
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          console.log(
            "Image data received, length:",
            imageData.length,
            "MIME type:",
            mimeType
          );
        } else if ("text" in part && part.text) {
          // Store the text
          textResponse = part.text;
          console.log(
            "Text response received:",
            textResponse.substring(0, 50) + "..."
          );
        }
      }
    }

    // Return just the base64 image and description as JSON
    return NextResponse.json({
        editedImage: imageData ? `data:${mimeType};base64,${imageData}` : null,
        responseText: textResponse,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}




// OLD CODE
// import { NextRequest, NextResponse } from 'next/server';
// // import { GoogleGenerativeAI } from '@google/generative-ai';
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// import fs from 'fs';
// import path from 'path';

// // Initialize the Google Generative AI client
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// export async function POST(request: NextRequest) {
//   try {
//     // Parse the request body
//     const body = await request.json();
//     const { image, command } = body;

//     if (!image || !command) {
//       return NextResponse.json(
//         { error: 'Image and command are required' },
//         { status: 400 }
//       );
//     }

//     // Extract base64 data from the data URL
//     const base64Image = image.split(',')[1];

//     // Prepare the content parts for the API request
//     const contents = [
//       { text: command },
//       {
//         inlineData: {
//           mimeType: 'image/png',
//           data: base64Image
//         }
//       }
//     ];

//     // Set up the model with image generation capability
//     const model = genAI.getGenerativeModel({
//       model: "gemini-2.0-flash-exp-image-generation",
//       generationConfig: {
//         responseModalities: ['Text', 'Image']
//       },
//       safetySettings: [
//         {
//           category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
//           threshold: HarmBlockThreshold.BLOCK_NONE
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, 
//           threshold: HarmBlockThreshold.BLOCK_NONE
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
//           threshold: HarmBlockThreshold.BLOCK_NONE
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_HARASSMENT,
//           threshold: HarmBlockThreshold.BLOCK_NONE
//         },
//         {
//           category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
//           threshold: HarmBlockThreshold.BLOCK_NONE
//         }
//       ],
//     });

//     // Generate content
//     const response = await model.generateContent(contents);
    
//     let editedImage = null;
//     let responseText = null;
//     let savedFilePath = null;

//     // Process the response
//     for (const part of response.response.candidates[0].content.parts) {
//       if (part.text) {
//         responseText = part.text;
//       } else if (part.inlineData) {
//         // Convert the base64 data to a data URL for response
//         editedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        
//         // Save the image locally
//         // try {
//         //   // Create a unique filename with timestamp
//         //   const timestamp = new Date().getTime();
//         //   const filename = `edited_image_${timestamp}.png`;
          
//         //   // Define the directory path (same as the API route)
//         //   const dirPath = path.join(process.cwd(), 'app/api/edit');
          
//         //   // Ensure the directory exists
//         //   if (!fs.existsSync(dirPath)) {
//         //     fs.mkdirSync(dirPath, { recursive: true });
//         //   }
          
//         //   // Define the full file path
//         //   const filePath = path.join(dirPath, filename);
          
//         //   // Convert base64 to buffer and write to file
//         //   const buffer = Buffer.from(part.inlineData.data, 'base64');
//         //   fs.writeFileSync(filePath, buffer);
          
//         //   savedFilePath = filePath;
//         //   console.log(`Image saved locally at: ${savedFilePath}`);
//         // } catch (saveError) {
//         //   console.error('Error saving image locally:', saveError);
//         // }
//       }
//     }

//     // Return the edited image, text response, and saved file path
//     return NextResponse.json({
//       editedImage,
//       responseText
//     });

//   } catch (error) {
//     console.error('Error processing image:', error);
//     return NextResponse.json(
//       { error: 'Failed to process image' },
//       { status: 500 }
//     );
//   }
// }
