import { describe, expect, it } from "vitest";
import { BADGES, earnedNow, type ProgressStats } from "@/lib/engage/badges";
import { GLOSSARY, termBySlug } from "@/lib/content/glossary";
import { ARTICLES } from "@/lib/content/learn";
import { RELEASES } from "@/lib/content/changelog";
import { FAQS } from "@/lib/content/help";
import { QUIZZES } from "@/lib/content/quizzes";
import { matchesAll, queryTokens, splitHighlight } from "@/lib/engage/highlight";
import { buildQuery, isDirty, parseQuery, sanitizeValue, sanitizeValues, type ParamSpec } from "@/lib/engage/params";
import { currentStreak, dayKey, KEYS, markBadgesSeen, markScenarioSaved, markToolUsed, parseDays, parseQuiz, parseStringList, parseVotes, recordDay, recordQuiz, setRead, setVote } from "@/lib/engage/progress";
import { optionOrder, quizProblems, scoreAnswers } from "@/lib/engage/quiz";
import { addScenario, MAX_SCENARIOS, parseScenarios, removeScenario } from "@/lib/engage/scenarios";
import { readRaw, writeRaw } from "@/lib/engage/store";
import { TOOL_SPECS } from "@/lib/tools/specs";

const SPEC: ParamSpec = {
  price: { kind: "num", min: 0, max: 1000 },
  mode: { kind: "pick", options: ["a", "b"] },
  list: { kind: "list", min: 0, max: 100, maxItems: 3 },
};
const DEFAULTS = { price: "", mode: "a", list: "" };

describe("share link params", () => {
  it("keeps valid values untouched", () => {
    expect(sanitizeValue(SPEC.price!, "12.5", "")).toBe("12.5");
    expect(sanitizeValue(SPEC.price!, "1,000", "")).toBe("1,000");
    expect(sanitizeValue(SPEC.mode!, "b", "a")).toBe("b");
  });
  it("clamps numbers into range", () => {
    expect(sanitizeValue(SPEC.price!, "5000", "")).toBe("1000");
    expect(sanitizeValue(SPEC.price!, "-4", "")).toBe("0");
  });
  it("falls back for junk, NaN, infinity and unknown options", () => {
    for (const bad of ["abc", "NaN", "Infinity", "1e999", "12abc", "<script>", ""]) expect(sanitizeValue(SPEC.price!, bad, "")).toBe("");
    expect(sanitizeValue(SPEC.mode!, "zzz", "a")).toBe("a");
    expect(sanitizeValue(SPEC.price!, undefined, "7")).toBe("7");
  });
  it("trims and clamps lists", () => {
    expect(sanitizeValue(SPEC.list!, "1, 2, 3, 4, 5", "")).toBe("1, 2, 3");
    expect(sanitizeValue(SPEC.list!, "50, 500", "")).toBe("50, 100");
    expect(sanitizeValue(SPEC.list!, "1, x", "")).toBe("");
    expect(sanitizeValue(SPEC.list!, "1 2 3", "")).toBe("1 2 3");
  });
  it("drops unknown keys and fills defaults", () => {
    expect(sanitizeValues(SPEC, { price: "9", evil: "x" }, DEFAULTS)).toEqual({ price: "9", mode: "a", list: "" });
  });
  it("round-trips through a query string", () => {
    const q = buildQuery(SPEC, { price: "12", mode: "b", list: "" }, DEFAULTS);
    expect(q).toBe("price=12&mode=b");
    expect(sanitizeValues(SPEC, parseQuery(`?${q}`), DEFAULTS)).toEqual({ price: "12", mode: "b", list: "" });
    expect(buildQuery(SPEC, DEFAULTS, DEFAULTS)).toBe("");
  });
  it("takes the first value of a repeated key and survives odd input", () => {
    expect(parseQuery("?price=1&price=2").price).toBe("1");
    expect(parseQuery("")).toEqual({});
    expect(isDirty({ price: "1", mode: "a", list: "" }, DEFAULTS)).toBe(true);
    expect(isDirty(DEFAULTS, DEFAULTS)).toBe(false);
  });
  it("has a spec whose defaults are valid for every calculator", () => {
    for (const [slug, spec] of Object.entries(TOOL_SPECS)) {
      for (const [k, rule] of Object.entries(spec)) {
        if (rule.kind === "num") expect(rule.min, `${slug}.${k}`).toBeLessThan(rule.max);
        if (rule.kind === "pick") expect(rule.options.length, `${slug}.${k}`).toBeGreaterThan(1);
      }
    }
  });
});

describe("scenarios", () => {
  it("adds newest first, trims the label and names blanks", () => {
    const a = addScenario([], "  My   plan ", { price: "1" }, 1000);
    expect(a.ok && a.saved.label).toBe("My plan");
    const b = addScenario(a.ok ? a.list : [], "", { price: "2" }, 2000);
    expect(b.ok && b.list.map((s) => s.label)).toEqual(["Scenario 2", "My plan"]);
  });
  it("refuses an eleventh scenario and allows more after a delete", () => {
    let list = [] as ReturnType<typeof removeScenario>;
    for (let i = 0; i < MAX_SCENARIOS; i++) {
      const r = addScenario(list, `s${i}`, { price: String(i) }, 5000);
      expect(r.ok).toBe(true);
      if (r.ok) list = r.list;
    }
    expect(new Set(list.map((s) => s.id)).size).toBe(MAX_SCENARIOS);
    expect(addScenario(list, "extra", {}, 5000).ok).toBe(false);
    const fewer = removeScenario(list, list[0]!.id);
    expect(addScenario(fewer, "extra", {}, 5000).ok).toBe(true);
  });
  it("parses stored data defensively and re-validates values", () => {
    const raw = JSON.stringify([{ id: "x", label: "ok", savedAt: 1, values: { price: "99999", mode: "zzz", evil: "1" } }, { id: 5 }, null, "str", { id: "y", label: "bad", savedAt: "no", values: {} }]);
    const list = parseScenarios(raw, SPEC, DEFAULTS);
    expect(list).toHaveLength(1);
    expect(list[0]!.values).toEqual({ price: "1000", mode: "a", list: "" });
    expect(parseScenarios("not json", SPEC, DEFAULTS)).toEqual([]);
    expect(parseScenarios(null, SPEC, DEFAULTS)).toEqual([]);
    expect(parseScenarios("{}", SPEC, DEFAULTS)).toEqual([]);
  });
});

describe("local store", () => {
  it("falls back to memory when localStorage is unavailable", () => {
    writeRaw("test:k", "v");
    expect(readRaw("test:k")).toBe("v");
    writeRaw("test:k", null);
    expect(readRaw("test:k")).toBeNull();
  });
});

describe("progress and streaks", () => {
  it("parses lists, quiz scores, days and votes defensively", () => {
    expect(parseStringList('["a","a","b",1,""]')).toEqual(["a", "b"]);
    expect(parseStringList("nope")).toEqual([]);
    expect(parseQuiz('{"x":{"best":3,"total":4},"y":{"best":9,"total":4},"z":5}')).toEqual({ x: { best: 3, total: 4 } });
    expect(parseDays('["2026-11-02","bad","2026-11-01"]')).toEqual(["2026-11-01", "2026-11-02"]);
    expect(parseVotes('{"a":"up","b":"sideways"}')).toEqual({ a: "up" });
  });
  it("counts consecutive days ending today or yesterday", () => {
    expect(currentStreak([], "2026-11-12")).toBe(0);
    expect(currentStreak(["2026-11-12"], "2026-11-12")).toBe(1);
    expect(currentStreak(["2026-11-10", "2026-11-11", "2026-11-12"], "2026-11-12")).toBe(3);
    expect(currentStreak(["2026-11-10", "2026-11-11"], "2026-11-12")).toBe(2);
    expect(currentStreak(["2026-11-09", "2026-11-11"], "2026-11-12")).toBe(1);
    expect(currentStreak(["2026-11-08"], "2026-11-12")).toBe(0);
    expect(currentStreak(["2026-02-27", "2026-02-28", "2026-03-01"], "2026-03-01")).toBe(3);
  });
  it("formats local days", () => {
    expect(dayKey(new Date(2026, 10, 2))).toBe("2026-11-02");
  });
  it("records reads, quizzes, tools and flags", () => {
    for (const k of Object.values(KEYS)) writeRaw(k, null);
    setRead("a", true);
    setRead("a", true);
    setRead("b", true);
    setRead("a", false);
    expect(parseStringList(readRaw(KEYS.read))).toEqual(["b"]);
    expect(parseDays(readRaw(KEYS.days))).toHaveLength(1);
    expect(recordQuiz("q", 2, 4)).toEqual({ best: 2, total: 4 });
    expect(recordQuiz("q", 4, 4)).toEqual({ best: 4, total: 4 });
    expect(recordQuiz("q", 1, 4)).toEqual({ best: 4, total: 4 });
    markToolUsed("t");
    markToolUsed("t");
    expect(parseStringList(readRaw(KEYS.tools))).toEqual(["t"]);
    markScenarioSaved();
    expect(readRaw(KEYS.saved)).toBe("1");
    markBadgesSeen(["x"]);
    markBadgesSeen(["x", "y"]);
    expect(parseStringList(readRaw(KEYS.seen))).toEqual(["x", "y"]);
    setVote("f", "up");
    setVote("g", "down");
    setVote("f", null);
    expect(parseVotes(readRaw(KEYS.votes))).toEqual({ g: "down" });
    recordDay(new Date(2026, 10, 12));
    recordDay(new Date(2026, 10, 12));
    expect(parseDays(readRaw(KEYS.days))).toContain("2026-11-12");
    for (const k of Object.values(KEYS)) writeRaw(k, null);
  });
});

describe("badges", () => {
  const base: ProgressStats = { read: 0, totalArticles: 12, perfectQuizzes: 0, savedScenario: false, toolsUsed: 0, streak: 0 };
  it("earns nothing from nothing", () => {
    expect(earnedNow(base)).toEqual([]);
  });
  it("earns each badge only when its goal is met", () => {
    expect(earnedNow({ ...base, read: 1 })).toEqual(["first-read"]);
    expect(earnedNow({ ...base, read: 5 })).toEqual(["first-read", "five-reads"]);
    expect(earnedNow({ ...base, read: 12 })).toContain("all-reads");
    expect(earnedNow({ ...base, read: 11 })).not.toContain("all-reads");
    expect(earnedNow({ ...base, perfectQuizzes: 1 })).toEqual(["perfect-quiz"]);
    expect(earnedNow({ ...base, savedScenario: true })).toEqual(["saved-scenario"]);
    expect(earnedNow({ ...base, toolsUsed: 4 })).toEqual([]);
    expect(earnedNow({ ...base, toolsUsed: 5 })).toEqual(["five-tools"]);
    expect(earnedNow({ ...base, streak: 3 })).toEqual(["streak-3"]);
  });
  it("does not award the read-all badge when there are no articles", () => {
    expect(earnedNow({ ...base, totalArticles: 0, read: 0 })).not.toContain("all-reads");
  });
  it("has unique ids", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
});

describe("quizzes", () => {
  it("covers at least six real articles with sound questions", () => {
    expect(QUIZZES.length).toBeGreaterThanOrEqual(6);
    const slugs = new Set(ARTICLES.map((a) => a.slug));
    for (const q of QUIZZES) {
      expect(slugs.has(q.slug), q.slug).toBe(true);
      expect(quizProblems(q), q.slug).toEqual([]);
    }
    expect(new Set(QUIZZES.map((q) => q.slug)).size).toBe(QUIZZES.length);
  });
  it("scores answers", () => {
    const quiz = QUIZZES[0]!;
    const right = quiz.questions.map((q) => q.answer);
    expect(scoreAnswers(quiz, right)).toBe(4);
    expect(scoreAnswers(quiz, [null, null, null, null])).toBe(0);
    expect(scoreAnswers(quiz, right.map((a, i) => (i === 0 ? (a + 1) % 4 : a)))).toBe(3);
    expect(scoreAnswers(quiz, [])).toBe(0);
  });
  it("shuffles options as a stable permutation", () => {
    for (let n = 3; n <= 5; n++) {
      const o = optionOrder("slug", 2, n);
      expect([...o].sort()).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(optionOrder("slug", 2, n)).toEqual(o);
    }
    const spread = new Set(Array.from({ length: 12 }, (_, i) => optionOrder("s", i, 4).indexOf(1)));
    expect(spread.size).toBeGreaterThan(1);
  });
});

describe("glossary", () => {
  it("has more than forty unique, alphabetical terms", () => {
    expect(GLOSSARY.length).toBeGreaterThan(40);
    expect(new Set(GLOSSARY.map((t) => t.slug)).size).toBe(GLOSSARY.length);
    const keys = GLOSSARY.map((t) => t.term.toLowerCase().replace(/[^a-z0-9]/g, ""));
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
  });
  it("gives every term a definition and resolvable related terms", () => {
    for (const t of GLOSSARY) {
      expect(t.definition.length, t.term).toBeGreaterThan(40);
      expect(t.related.length, t.term).toBeGreaterThan(0);
      expect(t.related.includes(t.slug), `${t.term} relates to itself`).toBe(false);
      for (const r of t.related) expect(termBySlug(r), `${t.term} -> ${r}`).toBeDefined();
    }
  });
});

describe("search highlighting", () => {
  it("tokenises and matches every word", () => {
    expect(queryTokens("  Gas  gas FEE ")).toEqual(["gas", "fee"]);
    expect(matchesAll("The gas fee is high", "fee gas")).toBe(true);
    expect(matchesAll("The gas fee is high", "fee rug")).toBe(false);
    expect(matchesAll("anything", "")).toBe(true);
  });
  it("marks matches case-insensitively and escapes regex characters", () => {
    expect(splitHighlight("Rug pull risk", "rug")).toEqual([{ text: "Rug", hit: true }, { text: " pull risk", hit: false }]);
    expect(splitHighlight("a (b) c", "(b)")).toEqual([{ text: "a ", hit: false }, { text: "(b)", hit: true }, { text: " c", hit: false }]);
    expect(splitHighlight("plain", "")).toEqual([{ text: "plain", hit: false }]);
    expect(splitHighlight("x", "[")).toEqual([{ text: "x", hit: false }]);
    expect(splitHighlight("", "a")).toEqual([{ text: "", hit: false }]);
  });
  it("highlights overlapping words by the longest first", () => {
    const runs = splitHighlight("liquidation liquid", "liquid liquidation");
    expect(runs.filter((r) => r.hit).map((r) => r.text)).toEqual(["liquidation", "liquid"]);
  });
});

describe("content rules", () => {
  const all = (): string[] => {
    const out: string[] = [];
    for (const g of GLOSSARY) out.push(g.term, g.definition);
    for (const q of QUIZZES) for (const k of q.questions) out.push(k.q, k.why, ...k.options);
    for (const r of RELEASES) out.push(r.title, r.summary, ...r.items.map((i) => i.text));
    for (const f of FAQS) out.push(f.q, f.a);
    return out;
  };
  it("uses no long dashes", () => {
    for (const text of all()) expect(text.includes(String.fromCharCode(0x2014)) || text.includes(String.fromCharCode(0x2013)), text).toBe(false);
  });
  it("lists the new release first with today's date", () => {
    expect(RELEASES[0]!.date).toBe("2026-11-12");
    expect(RELEASES[0]!.items.map((i) => i.text).join(" ")).toContain("/glossary");
  });
});
