import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

const PROMPT = `Ти помічник для сервісу карпулінгу в Україні.
Отримай текст оголошення і поверни ТІЛЬКИ JSON без пояснень:
{
  "aiText": "структурований текст до 200 символів з емодзі",
  "searchFrom": "відправлення і проміжні точки через пробіл, все lowercase",
  "searchTo": "проміжні точки і призначення через пробіл, все lowercase",
  "isRoundTrip": true або false
}
Назви населених пунктів нормалізуй до повної офіційної назви lowercase.
КПП пиши з уточненням якщо зрозуміло з контексту: "кпп бучанський".
Якщо маршрут двосторонній (є "і назад", "туди-назад") — isRoundTrip: true.`;

export interface AIResult {
  aiText: string;
  searchFrom: string;
  searchTo: string;
  isRoundTrip: boolean;
}

export const processWithAI = async (userText: string): Promise<AIResult | null> => {
  try {
    const result = await model.generateContent(PROMPT + "\n\nТекст оголошення:\n" + userText);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return parsed as AIResult;
  } catch (error) {
    console.error("Помилка Gemini:", error);
    return null;
  }
};
