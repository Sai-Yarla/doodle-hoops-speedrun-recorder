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
      description: "True if the 'Game Over' summary screen is visible (Blue ribbon with score, green replay button).",
    },
    score: {
      type: Type.INTEGER,
      description: "The numeric score displayed on the blue ribbon. 0 if not visible.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence level of the detection between 0 and 1.",
    },
  },
  required: ["isGameOver", "score", "confidence"],
};

export const analyzeGameFrame = async (base64Image: string): Promise<AnalysisResult> => {
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
          text: `Analyze this game screenshot to determine the game state.
          
          Visual Definitions for "Game Over":
          1. A large BLUE RIBBON/BANNER centered at the top.
          2. Inside the ribbon, white numbers indicating the SCORE.
          3. Gold stars may be present on the ribbon.
          4. A GREEN REPLAY BUTTON (square with a white circular arrow) centered below the ribbon.
          5. The text "https://www.google.com/doodles/basketball-2012" is visible (usually in a white box below the button).
          
          Task:
          - If the Blue Ribbon AND (Green Replay Button OR the specific URL text) are visible, set isGameOver = true and extract the score.
          - If these elements are NOT visible (e.g., active gameplay, moving players, start menu without the blue ribbon), set isGameOver = false.
          
          Return the result in JSON.`
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: analysisSchema,
      systemInstruction: "You are a referee for the Google Doodle Basketball game. Your primary job is to detect the specific 'Game Over' summary screen with high precision.",
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  const result = JSON.parse(text) as AnalysisResult;
  return result;
};