export interface SessionData {
  action: "publish" | "search" | null;
  step: "idle" | "waiting_role" | "waiting_text" | "waiting_edit";
  role: "driver" | "passenger" | null;
  aiText: string | null;
  searchFrom: string | null;
  searchTo: string | null;
  isRoundTrip: boolean;
  schedule: string | null;
  searchOffset: number;
}

export function initialSession(): SessionData {
  return {
    action: null,
    step: "idle",
    role: null,
    aiText: null,
    searchFrom: null,
    searchTo: null,
    isRoundTrip: false,
    schedule: null,
    searchOffset: 0,
  };
}