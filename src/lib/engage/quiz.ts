import type { Quiz } from "@/lib/content/quizzes";

/** Number of answers that match the correct option. Unanswered questions count as wrong. */
export function scoreAnswers(quiz: Quiz, answers: Array<number | null>): number {
  return quiz.questions.reduce((n, q, i) => (answers[i] === q.answer ? n + 1 : n), 0);
}

/** Problems that would make a quiz unusable. An empty list means the quiz is sound. */
export function quizProblems(quiz: Quiz): string[] {
  const out: string[] = [];
  if (quiz.questions.length !== 4) out.push(`${quiz.slug}: needs exactly four questions`);
  quiz.questions.forEach((q, i) => {
    if (q.options.length < 3 || q.options.length > 5) out.push(`${quiz.slug} Q${i + 1}: needs three to five options`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) out.push(`${quiz.slug} Q${i + 1}: answer index out of range`);
    if (new Set(q.options).size !== q.options.length) out.push(`${quiz.slug} Q${i + 1}: duplicate options`);
    if (q.why.trim().length < 20) out.push(`${quiz.slug} Q${i + 1}: explanation too short`);
  });
  return out;
}

/** A fixed shuffle of option positions for one question, so the right answer is not always in the same slot. Same inputs always give the same order. */
export function optionOrder(slug: string, questionIndex: number, count: number): number[] {
  let h = 2166136261;
  for (const ch of `${slug}:${questionIndex}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j] as number, order[i] as number];
  }
  return order;
}
