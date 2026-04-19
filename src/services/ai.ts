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

const removePhoneNumbers = (text: string): string => {
  return text
    .replace(/(\+?38)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const processWithAI = async (userText: string, username?: string): Promise<AIResult | null> => {
  try {
    const textWithContact = username 
      ? userText + "\n\nКонтакт: @" + username
      : userText;
    
    const result = await model.generateContent(textWithContact);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    parsed.aiText = removePhoneNumbers(parsed.aiText)
  .replace(/📍/g, "\n📍")
  .replace(/🕒/g, "\n🕒")
  .replace(/📝/g, "\n📝")
  .replace(/💰/g, "\n💰")
  .replace(/📩/g, "\n📩")
  .trim();   
    return parsed as AIResult;
  } catch (error) {
    console.error("Помилка Gemini:", error);
    return null;
  }
};