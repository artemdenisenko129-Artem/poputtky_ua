import { Bot, Context, session, SessionFlavor } from "grammy";
import dotenv from "dotenv";
import { SessionData, initialSession } from "./session";

dotenv.config();

type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);

bot.use(session({ initial: initialSession }));

bot.command("start", (ctx) => {
  ctx.session.step = "idle";
  ctx.reply("👋 Вітаємо, " + ctx.from?.first_name + "!\n\nЯ допоможу оформити оголошення про поїздку або знайти попутника.", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📝 Опублікувати оголошення", callback_data: "publish" }],
        [{ text: "🔍 Тільки пошук", callback_data: "search" }]
      ]
    }
  });
});

bot.callbackQuery("publish", async (ctx) => {
  ctx.session.action = "publish";
  ctx.session.step = "waiting_role";
  await ctx.answerCallbackQuery();
  await ctx.reply("Ти водій чи пасажир?", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🚗 Я Водій", callback_data: "role_driver" },
          { text: "💺 Я Пасажир", callback_data: "role_passenger" }
        ]
      ]
    }
  });
});

bot.callbackQuery("search", async (ctx) => {
  ctx.session.action = "search";
  ctx.session.step = "waiting_role";
  await ctx.answerCallbackQuery();
  await ctx.reply("Ти водій чи пасажир?", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🚗 Я Водій", callback_data: "role_driver" },
          { text: "💺 Я Пасажир", callback_data: "role_passenger" }
        ]
      ]
    }
  });
});

bot.callbackQuery("role_driver", async (ctx) => {
  ctx.session.role = "driver";
  ctx.session.step = "waiting_text";
  await ctx.answerCallbackQuery();
  await ctx.reply("✏️ Опиши свій маршрут (до 300 символів).\n\nПриклад:\n\"Їду щодня з Ірпінь (ЖД вокзал) до Києва (Оболонь) і назад.\nВиїзд ~7:00, назад ~18:00. Через Гостомель, КПП.\nЄ 2 місця. Пишіть в особисті.\"");
});

bot.callbackQuery("role_passenger", async (ctx) => {
  ctx.session.role = "passenger";
  ctx.session.step = "waiting_text";
  await ctx.answerCallbackQuery();
  await ctx.reply("✏️ Опиши свій маршрут (до 300 символів).\n\nПриклад:\n\"Їду щодня з Ірпінь (ЖД вокзал) до Києва (Оболонь) і назад.\nВиїзд ~7:00, назад ~18:00. Через Гостомель, КПП.\nЄ 2 місця. Пишіть в особисті.\"");
});

bot.on("message:text", async (ctx) => {
  if (ctx.session.step === "waiting_text") {
    const text = ctx.message.text;
    if (text.length > 300) {
      await ctx.reply("⚠️ Текст занадто довгий! Максимум 300 символів. Спробуй ще раз.");
      return;
    }
    ctx.session.aiText = text;
    ctx.session.step = "idle";
    await ctx.reply("✅ Текст отримано!\n\n" + text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Підтвердити", callback_data: "confirm" }],
          [{ text: "✏️ Редагувати", callback_data: "edit" }],
          [{ text: "🗑 Скасувати", callback_data: "cancel" }]
        ]
      }
    });
  }
});

bot.callbackQuery("cancel", async (ctx) => {
  ctx.session.step = "idle";
  await ctx.answerCallbackQuery();
  await ctx.reply("Скасовано. Що хочеш зробити?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📝 Опублікувати оголошення", callback_data: "publish" }],
        [{ text: "🔍 Тільки пошук", callback_data: "search" }]
      ]
    }
  });
});

const start = async () => {
  bot.start();
  console.log("Бот запущено! ✅");
};

start();