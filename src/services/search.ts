import { Announcement } from "./db";

export interface SearchParams {
  userId: number;
  role: "driver" | "passenger";
  searchFrom: string;
  searchTo: string;
  offset?: number;
  limit?: number;
}

export const searchAnnouncements = async (params: SearchParams) => {
  const oppositeRole = params.role === "driver" ? "passenger" : "driver";

  const fromWords = params.searchFrom.split(/\s+/).filter(w => w.length > 2);
  const toWords = params.searchTo.split(/\s+/).filter(w => w.length > 2);

  if (fromWords.length === 0 || toWords.length === 0) {
    return { results: [], total: 0 };
  }

  const fromRegex = new RegExp(fromWords.join("|"), "i");
  const toRegex = new RegExp(toWords.join("|"), "i");

  const query = {
    isActive: true,
    telegramUserId: { $ne: params.userId },
    role: oppositeRole,
    searchFrom: fromRegex,
    searchTo: toRegex,
  };

  const total = await Announcement.countDocuments(query);
  const results = await Announcement.find(query)
    .sort({ createdAt: -1 })
    .skip(params.offset || 0)
    .limit(params.limit || 5);

  return { results, total };
};