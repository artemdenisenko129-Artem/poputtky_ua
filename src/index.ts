import http from "http";
import { Bot, Context, session, SessionFlavor } from "grammy";
import dotenv from "dotenv";
import { SessionData, initialSession } from "./session";
import { processWithAI } from "./services/ai";
import { connectDB, Announcement } from "./services/db";
import { publishToChat, publishToChannel } from "./services/telegram";
import { searchAnnouncements } from "./services/search";

dotenv.config();

type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);

bot.use(session({ initial: initialSession }));

bot.catch((err) => {
  console.error("Помилка бота:", err.message);
});

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
  await ctx.reply("Кого шукаєш — водія чи пасажира?\n\nВибери СВОЮ роль:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🚗 Я Водій (шукаю пасажирів)", callback_data: "role_driver" },
          { text: "💺 Я Пасажир (шукаю водіїв)", callback_data: "role_passenger" }
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
    await ctx.reply("⏳ Обробляю...");
    const username = ctx.from?.username;
    const aiResult = await processWithAI(text, username);

    if (!aiResult) {
      await ctx.reply("⚠️ Не вдалося обробити текст. Спробуй ще раз.");
      return;
    }

    ctx.session.aiText = aiResult.aiText;
    ctx.session.searchFrom = aiResult.searchFrom;
    ctx.session.searchTo = aiResult.searchTo;
    ctx.session.isRoundTrip = aiResult.isRoundTrip;
    ctx.session.schedule = aiResult.schedule;
    ctx.session.step = "idle";

    const buttons = ctx.session.action === "search"
      ? [
          [{ text: "🔍 Шукати", callback_data: "confirm" }],
          [{ text: "✏️ Редагувати", callback_data: "edit" }],
          [{ text: "🗑 Скасувати", callback_data: "cancel" }]
        ]
      : [
          [{ text: "✅ Підтвердити", callback_data: "confirm" }],
          [{ text: "✏️ Редагувати", callback_data: "edit" }],
          [{ text: "🗑 Скасувати", callback_data: "cancel" }]
        ];

    await ctx.reply("✅ Текст отримано!\n\n" + aiResult.aiText, {
      reply_markup: { inline_keyboard: buttons }
    });
  }
});

// Допоміжна функція для показу результатів пошуку
const showSearchResults = async (ctx: any, role: string, results: any[], total: number) => {
  const oppositeRoleText = role === "driver" ? "пасажирів" : "водіїв";
  await ctx.reply(`🔍 Знайдено ${total} ${oppositeRoleText}. Показую ${Math.min(results.length, 5)} найновіших:`);

  for (const ann of results) {
    const userLink = ann.telegramUsername
      ? `\n\n📩 Зв'язатись: @${ann.telegramUsername}`
      : "";
    await ctx.reply((ann.aiText || "") + userLink);
  }
};

bot.callbackQuery("confirm", async (ctx) => {
  await ctx.answerCallbackQuery();

  // ============ ПУБЛІКАЦІЯ ============
  if (ctx.session.action === "publish") {
    await ctx.reply("⏳ Публікую оголошення...");

    const text = ctx.session.aiText!;
    const chatMsgId = await publishToChat(bot.api, text);
    const channelMsgId = await publishToChannel(bot.api, text);

    try {
      await Announcement.create({
        telegramUserId: ctx.from?.id,
        telegramUsername: ctx.from?.username,
        role: ctx.session.role,
        aiText: ctx.session.aiText,
        searchFrom: ctx.session.searchFrom,
        searchTo: ctx.session.searchTo,
        isRoundTrip: ctx.session.isRoundTrip,
        chatMessageId: chatMsgId,
        channelMessageId: channelMsgId,
      });

      if (ctx.session.isRoundTrip) {
        await Announcement.create({
          telegramUserId: ctx.from?.id,
          telegramUsername: ctx.from?.username,
          role: ctx.session.role,
          aiText: ctx.session.aiText,
          searchFrom: ctx.session.searchTo,
          searchTo: ctx.session.searchFrom,
          isRoundTrip: true,
          chatMessageId: chatMsgId,
          channelMessageId: channelMsgId,
        });
      }

      console.log("✅ Оголошення збережено в БД");
    } catch (error) {
      console.error("❌ Помилка збереження в БД:", error);
    }

    await ctx.reply("✅ Оголошення опубліковано!", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "👀 Моє оголошення в каналі", url: "https://t.me/" + process.env.CHANNEL_ID?.replace("@", "") + "/" + channelMsgId }]
        ]
      }
    });

    // 🆕 АВТОПОШУК — шукаємо чи вже є попутники
    await ctx.reply("🔎 Перевіряю чи є попутники за твоїм маршрутом...");

    const { results, total } = await searchAnnouncements({
      userId: ctx.from!.id,
      role: ctx.session.role!,
      searchFrom: ctx.session.searchFrom!,
      searchTo: ctx.session.searchTo!,
      offset: 0,
      limit: 5,
    });

    if (total === 0) {
      await ctx.reply("😔 Поки за твоїм маршрутом нікого немає. Чекай — нові оголошення з'являться найближчим часом!", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🏠 Головне меню", callback_data: "menu" }]
          ]
        }
      });
    } else {
      await showSearchResults(ctx, ctx.session.role!, results, total);
      await ctx.reply("Що далі?", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🏠 Головне меню", callback_data: "menu" }]
          ]
        }
      });
    }
  }

  // ============ ПОШУК ============
  if (ctx.session.action === "search") {
    await ctx.reply("⏳ Шукаю попутників...");

    const { results, total } = await searchAnnouncements({
      userId: ctx.from!.id,
      role: ctx.session.role!,
      searchFrom: ctx.session.searchFrom!,
      searchTo: ctx.session.searchTo!,
      offset: 0,
      limit: 5,
    });

    if (total === 0) {
      await ctx.reply("😔 Поки попутників за цим маршрутом не знайдено.\n\nСпробуй пізніше — нові оголошення з'являються щодня.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📢 Перейти в канал", url: "https://t.me/" + process.env.CHANNEL_ID?.replace("@", "") }],
            [{ text: "🏠 Головне меню", callback_data: "menu" }]
          ]
        }
      });
      return;
    }

    await showSearchResults(ctx, ctx.session.role!, results, total);
    await ctx.reply("Що далі?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🏠 Головне меню", callback_data: "menu" }]
        ]
      }
    });
  }
});

bot.callbackQuery("menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Що хочеш зробити?", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📝 Опублікувати оголошення", callback_data: "publish" }],
        [{ text: "🔍 Тільки пошук", callback_data: "search" }]
      ]
    }
  });
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
  await connectDB();
  bot.start();
  console.log("Бот запущено! ✅");
};

start();

// HTTP сервер для health checks (потрібен для хостингу)
const port = parseInt(process.env.PORT || "8080");
http.createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running! 🤖");
}).listen(port, () => {
  console.log(`🌐 HTTP сервер на порту ${port}`);
});