import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { SYSTEM_PROMPT } from "./prompt";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash-lite",
  systemInstruction: SYSTEM_PROMPT
});

export interface AIResult {
  from: string;
  to: string;
  via: string[];
  searchFrom: string;
  searchTo: string;
  isRoundTrip: boolean;
  schedule: string;
  aiText: string;
}

export const processWithAI = async (userText: string): Promise<AIResult | null> => {
  try {
    const result = await model.generateContent(userText);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return parsed as AIResult;
  } catch (error) {
    console.error("Помилка Gemini:", error);
    return null;
  }
};