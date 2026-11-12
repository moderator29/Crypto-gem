export interface ProgressStats {
  read: number;
  totalArticles: number;
  perfectQuizzes: number;
  savedScenario: boolean;
  toolsUsed: number;
  streak: number;
}

export type BadgeIcon = "book" | "books" | "award" | "target" | "bookmark" | "calc" | "flame";

export interface BadgeDef {
  id: string;
  label: string;
  how: string;
  icon: BadgeIcon;
  /** Current value and goal, used for the progress hint on locked badges. */
  progress: (s: ProgressStats) => { value: number; goal: number };
}

/** Badges are earned only from actions the person took in the guides, quizzes and calculators on this device. */
export const BADGES: BadgeDef[] = [
  { id: "first-read", label: "First guide", how: "Mark one guide as read.", icon: "book", progress: (s) => ({ value: s.read, goal: 1 }) },
  { id: "five-reads", label: "Getting going", how: "Mark five guides as read.", icon: "books", progress: (s) => ({ value: s.read, goal: 5 }) },
  { id: "all-reads", label: "Cover to cover", how: "Mark every guide as read.", icon: "award", progress: (s) => ({ value: s.read, goal: Math.max(1, s.totalArticles) }) },
  { id: "perfect-quiz", label: "Perfect score", how: "Get every question right in a guide quiz.", icon: "target", progress: (s) => ({ value: Math.min(1, s.perfectQuizzes), goal: 1 }) },
  { id: "saved-scenario", label: "Scenario saver", how: "Save a calculator scenario.", icon: "bookmark", progress: (s) => ({ value: s.savedScenario ? 1 : 0, goal: 1 }) },
  { id: "five-tools", label: "Calculator regular", how: "Use five different calculators.", icon: "calc", progress: (s) => ({ value: s.toolsUsed, goal: 5 }) },
  { id: "streak-3", label: "Three-day streak", how: "Read or take a quiz on three days in a row.", icon: "flame", progress: (s) => ({ value: s.streak, goal: 3 }) },
];

/** Ids of badges whose goal is met by the current stats. */
export function earnedNow(s: ProgressStats): string[] {
  return BADGES.filter((b) => {
    const p = b.progress(s);
    return p.value >= p.goal;
  }).map((b) => b.id);
}
