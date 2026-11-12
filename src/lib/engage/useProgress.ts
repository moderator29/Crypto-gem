"use client";

import { useMemo } from "react";
import { type ProgressStats } from "./badges";
import { currentStreak, dayKey, KEYS, parseDays, parseFlag, parseQuiz, parseStringList, parseVotes, type QuizBest, type Vote } from "./progress";
import { useStored } from "./useStored";

/** Slugs of articles marked as read on this device. */
export function useReadSlugs(): string[] {
  return useStored(KEYS.read, parseStringList);
}

/** Best quiz score per article on this device. */
export function useQuizScores(): Record<string, QuizBest> {
  return useStored(KEYS.quiz, parseQuiz);
}

/** Help answers the person rated, kept on this device only. */
export function useHelpVotes(): Record<string, Vote> {
  return useStored(KEYS.votes, parseVotes);
}

/** Badge ids whose unlock animation has already played. */
export function useSeenBadges(): string[] {
  return useStored(KEYS.seen, parseStringList);
}

/** Everything badges and the progress card are built from, derived from actions stored on this device. */
export function useProgressStats(slugs: string[]): ProgressStats {
  const read = useReadSlugs();
  const quiz = useQuizScores();
  const days = useStored(KEYS.days, parseDays);
  const tools = useStored(KEYS.tools, parseStringList);
  const saved = useStored(KEYS.saved, parseFlag);
  return useMemo(() => {
    const known = new Set(slugs);
    return {
      read: read.filter((s) => known.has(s)).length,
      totalArticles: slugs.length,
      perfectQuizzes: Object.entries(quiz).filter(([s, q]) => known.has(s) && q.best === q.total).length,
      savedScenario: saved,
      toolsUsed: tools.length,
      streak: currentStreak(days, dayKey(new Date())),
    };
  }, [slugs, read, quiz, days, tools, saved]);
}
