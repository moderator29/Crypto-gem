"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Stepper } from "@/components/ui/Kit";
import { NavIcon, type NavIconName } from "@/components/ui/NavIcon";

const KEY = "cg:tour-done";
const STEPS: Array<{ icon: NavIconName; title: string; text: string; href: string; cta: string }> = [
  { icon: "markets", title: "Find what is moving", text: "The price board ranks pools by an organic score. Sort any column, filter by chain, and watch the 7 day trend on every row.", href: "/markets", cta: "Open Markets" },
  { icon: "alert", title: "Never miss a level", text: "Tap the star to watch a token, or the bell to set a price alert. Alerts land in your notifications.", href: "/alerts", cta: "Set an alert" },
  { icon: "tools", title: "Check before you buy", text: "Every token page shows a combined risk meter, pool depth and a non-custodial Buy panel. We never hold your funds.", href: "/learn", cta: "Read the guides" },
  { icon: "boost", title: "Launching a project?", text: "List your coin in minutes, then Boost it or book a banner. Everything sponsored is clearly labelled.", href: "/add-coin", cta: "Add a coin" },
];

/** First-visit walkthrough. Shown once per browser, never blocks navigation, and can be skipped at any step. */
export function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    let done = true;
    try {
      done = window.localStorage.getItem(KEY) === "1";
    } catch {
      done = true;
    }
    if (done) return;
    const t = setTimeout(() => setOpen(true), 1800);
    return () => clearTimeout(t);
  }, []);
  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* the tour may show again next visit */
    }
  };
  const s = STEPS[i] as (typeof STEPS)[number];
  const last = i === STEPS.length - 1;
  return (
    <Dialog open={open} onClose={close} variant="sheet" title="Welcome to CryptoGemCN" description="A 30 second look at what you can do here." footer={<><button type="button" className="btn" onClick={close}>Skip</button>{i > 0 && <button type="button" className="btn" onClick={() => setI(i - 1)}>Back</button>}<button type="button" className="btn btn-primary" onClick={() => (last ? close() : setI(i + 1))}>{last ? "Start exploring" : "Next"}</button></>}>
      <div className="space-y-5">
        <Stepper steps={["Explore", "Alerts", "Check", "Launch"]} current={i} />
        <div key={i} className="fx-pop flex gap-4">
          <span className="fx-float grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--brand)_16%,transparent)]"><NavIcon name={s.icon} size={28} /></span>
          <div>
            <h3 className="h3">{s.title}</h3>
            <p className="mt-1 text-sm text-soft">{s.text}</p>
            <Link href={s.href} onClick={close} className="mt-3 inline-block text-sm font-semibold text-brand hover:text-text">{s.cta} →</Link>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
