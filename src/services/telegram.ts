import { Api } from "grammy";
import dotenv from "dotenv";

dotenv.config();

const CHAT_ID = process.env.CHAT_ID!;
const CHANNEL_ID = process.env.CHANNEL_ID!;
const BOT_USERNAME = process.env.BOT_USERNAME!;

export const publishToChat = async (api: Api, text: string): Promise<number | null> => {
  try {
    const msg = await api.sendMessage(CHAT_ID, text);
    return msg.message_id;
  } catch (error) {
    console.error("Помилка публікації в чат:", error);
    return null;
  }
};

export const publishToChannel = async (api: Api, text: string): Promise<number | null> => {
  try {
    const msg = await api.sendMessage(CHANNEL_ID, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔍 Знайти попутника → бот", url: "https://t.me/" + BOT_USERNAME }]
        ]
      }
    });
    return msg.message_id;
  } catch (error) {
    console.error("Помилка публікації в канал:", error);
    return null;
  }
};