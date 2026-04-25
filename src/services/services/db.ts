import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("MongoDB підключено! ✅");
  } catch (error) {
    console.error("Помилка підключення до MongoDB:", error);
    console.log("⚠️ Бот працює без MongoDB");
  }
};

const announcementSchema = new mongoose.Schema({
  telegramUserId: Number,
  telegramUsername: String,
  role: String,
  aiText: String,
  searchFrom: String,
  searchTo: String,
  isRoundTrip: Boolean,
  chatMessageId: Number,
  channelMessageId: Number,
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

announcementSchema.index({ searchFrom: "text", searchTo: "text" });

export const Announcement = mongoose.model("Announcement", announcementSchema);