import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features may not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function generateItemDetails(keywords: string) {
  if (!apiKey) throw new Error("AI Service unavailable: Missing API Key");

  const prompt = `You are a professional marketplace copywriter for Nigerian university students (CampXchange).
  Based on these keywords: "${keywords}", generate:
  1. A catchy, professional product title.
  2. A compelling, honest description that highlights the item's value to a student.
  
  Use Nigerian student slang sparingly where it makes sense (e.g., "clean", "working perfect").
  Format: JSON { "title": string, "description": string }`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["title", "description"],
      },
    },
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { title: keywords, description: `A great ${keywords} for sale!` };
  }
}
