import { Bot } from "grammy";
import dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) => {
  ctx.reply("👋 Вітаємо, " + ctx.from?.first_name + "!\n\nЯ допоможу оформити оголошення про поїздку або знайти попутника.", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📝 Опублікувати оголошення", callback_data: "publish" }],
        [{ text: "🔍 Тільки пошук", callback_data: "search" }]
      ]
    }
  });
});

bot.start();
console.log("Бот запущено! ✅");