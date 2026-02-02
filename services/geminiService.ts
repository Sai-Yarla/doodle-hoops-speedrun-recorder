import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

// Initialize Gemini
// NOTE: Process.env.API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-flash-preview';

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isGameOver: {
      type: Type.BOOLEAN,
      description: "True if the game is in a 'Game Over' state showing the final score board. False if playing or in menu.",
    },
    score: {
      type: Type.INTEGER,
      description: "The numeric score displayed on the screen. 0 if not visible.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence level of the detection between 0 and 1.",
    },
  },
  required: ["isGameOver", "score", "confidence"],
};

export const analyzeGameFrame = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    // Remove header if present (e.g., "data:image/png;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this game screenshot. 
            1. Is the game over? Look for text like "Game Over" or a final score summary screen.
            2. What is the final score?
            
            Return the result in JSON format.`
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
        systemInstruction: "You are a referee for a browser-based basketball game. Your job is to precisely detect when a game run has ended and report the final score.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(text) as AnalysisResult;
    return result;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return { isGameOver: false, score: 0, confidence: 0 };
  }
};
