"use client";

import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { fireConfetti } from "@/components/fx/confetti";
import { playSound } from "@/components/fx/sound";
import { quizBySlug } from "@/lib/content/quizzes";
import { recordQuiz } from "@/lib/engage/progress";
import { optionOrder, scoreAnswers } from "@/lib/engage/quiz";
import { useQuizScores } from "@/lib/engage/useProgress";
import { ProgressRing } from "./ProgressRing";

const LETTERS = ["A", "B", "C", "D", "E"];

/** Four-question check at the end of a guide. One question at a time, an explanation after every answer, and the best score is kept on this device. */
export function Quiz({ slug }: { slug: string }) {
  const quiz = quizBySlug(slug);
  const scores = useQuizScores();
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const total = quiz?.questions.length ?? 0;
  const q = quiz?.questions[idx];
  const order = useMemo(() => (q ? optionOrder(slug, idx, q.options.length) : []), [slug, idx, q]);
  if (!quiz || !q) return null;
  const best = scores[slug];

  const restart = () => {
    setStarted(true);
    setIdx(0);
    setAnswers([]);
    setPicked(null);
    setFinished(false);
  };

  const choose = (shown: number) => {
    if (picked !== null) return;
    const original = order[shown] as number;
    setPicked(shown);
    setAnswers((a) => [...a.slice(0, idx), original]);
    playSound(original === q.answer ? "tap" : "error");
  };

  const next = () => {
    if (idx < total - 1) {
      setIdx(idx + 1);
      setPicked(null);
      return;
    }
    const score = scoreAnswers(quiz, answers);
    recordQuiz(slug, score, total);
    setFinished(true);
    if (score === total) {
      fireConfetti({ sound: false });
      playSound("success");
    }
  };

  if (finished) {
    const score = scoreAnswers(quiz, answers);
    const perfect = score === total;
    return (
      <section className="card fx-pop space-y-4 p-5 text-center" aria-labelledby="quiz-h" aria-live="polite">
        <h2 id="quiz-h" className="h3">{perfect ? "Perfect score" : "Quiz complete"}</h2>
        <div className="flex justify-center"><ProgressRing value={score} total={total} size={96} stroke={9} label={`Score ${score} out of ${total}`} /></div>
        <p className="text-sm text-soft">{perfect ? "Every answer right. Nicely done." : score >= total - 1 ? "Close. Reread the sections behind the ones you missed and try again." : "Worth another read of the guide, then try again."}</p>
        {best && <p className="text-xs text-muted">Best on this device: {best.best} of {best.total}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-sm" onClick={restart}><RotateCcw size={14} aria-hidden="true" /> Try again</button>
        </div>
      </section>
    );
  }

  if (!started) {
    return (
      <section className="card space-y-3 p-5" aria-labelledby="quiz-h">
        <h2 id="quiz-h" className="h3">Check what you learned</h2>
        <p className="text-sm text-soft">{total} questions about this guide. You see the reason behind every answer. Your score stays on this device.</p>
        {best && <p className="text-xs text-muted">Best so far: {best.best} of {best.total}</p>}
        <button type="button" className="btn btn-primary btn-sm" onClick={restart}>{best ? "Take it again" : "Start the quiz"} <ArrowRight size={14} aria-hidden="true" /></button>
      </section>
    );
  }

  const answered = picked !== null;
  const correct = answered && order[picked] === q.answer;
  return (
    <section className="card space-y-4 p-5" aria-labelledby="quiz-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="quiz-h" className="h3">Question {idx + 1} of {total}</h2>
        <ol className="flex gap-1.5" aria-label="Progress">
          {quiz.questions.map((question, i) => {
            const a = answers[i];
            const state = i > idx || (i === idx && !answered) ? "todo" : a === question.answer ? "right" : "wrong";
            return <li key={i} className="quiz-seg" data-state={state} />;
          })}
        </ol>
      </div>
      <p key={idx} className="fx-fade text-[15px] font-semibold leading-snug md:text-base">{q.q}</p>
      <ul key={`o${idx}`} className="stagger space-y-2">
        {order.map((original, shown) => {
          const isPick = picked === shown;
          const isRight = original === q.answer;
          const state = !answered ? "idle" : isRight ? "right" : isPick ? "wrong" : "dim";
          return (
            <li key={original}>
              <button type="button" className="quiz-opt" data-state={state} aria-disabled={answered} onClick={() => choose(shown)}>
                <span className="quiz-letter" aria-hidden="true">{state === "right" ? <Check size={14} /> : state === "wrong" ? <X size={14} /> : LETTERS[shown]}</span>
                <span className="min-w-0 flex-1 text-left">{q.options[original]}</span>
                {answered && (isRight || isPick) && <span className="sr-only">{isRight ? "Correct answer" : "Your answer, incorrect"}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {answered && (
        <div className="fx-pop space-y-3" role="status">
          <div className={`rounded-[var(--r-md)] border p-3.5 text-sm leading-relaxed ${correct ? "border-[color-mix(in_srgb,var(--up)_40%,transparent)] bg-[color-mix(in_srgb,var(--up)_8%,transparent)]" : "border-[color-mix(in_srgb,var(--down)_40%,transparent)] bg-[color-mix(in_srgb,var(--down)_8%,transparent)]"}`}>
            <p className={`font-semibold ${correct ? "text-up" : "text-down"}`}>{correct ? "Correct" : "Not quite"}</p>
            <p className="mt-1 text-soft">{q.why}</p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" autoFocus onClick={next}>{idx < total - 1 ? "Next question" : "See my score"} <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
      )}
    </section>
  );
}
