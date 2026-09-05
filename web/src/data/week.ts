import type { Day } from "../types";

export const WEEK_LABEL = "Week of Sep 7–11, 2026";

export const WEEK_DATES: Record<Day, string> = {
  Mon: "Sep 7",
  Tue: "Sep 8",
  Wed: "Sep 9",
  Thu: "Sep 10",
  Fri: "Sep 11",
};

export const ENGINEER_USER_IDS = [1, 2, 3] as const;
export const CANDIDATE_USER_IDS = [4, 5, 6, 7] as const;

export const ENGINEER_COLORS = ["#215e75", "#c05621", "#4a5080"] as const;
