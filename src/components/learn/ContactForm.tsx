"use client";

import { AlertCircle, Copy, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

const TOPICS = ["General question", "Listing", "Boost", "Banners and ads", "Payment or order", "Account", "Data problem", "Report a problem"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_MESSAGE = 20;

interface Values { name: string; email: string; topic: string; order: string; message: string }
const EMPTY: Values = { name: "", email: "", topic: TOPICS[0] as string, order: "", message: "" };

/** Checks the form and returns a message per field that needs attention. */
export function validate(v: Values): Partial<Record<keyof Values, string>> {
  const e: Partial<Record<keyof Values, string>> = {};
  if (v.name.trim().length < 2) e.name = "Enter your name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address so we can reply.";
  if (v.message.trim().length < MIN_MESSAGE) e.message = `Write at least ${MIN_MESSAGE} characters so we can help properly.`;
  return e;
}

function compose(v: Values): { subject: string; body: string } {
  const lines = [v.message.trim(), "", "---", `Name: ${v.name.trim()}`, `Reply to: ${v.email.trim()}`];
  if (v.order.trim()) lines.push(`Order: ${v.order.trim()}`);
  return { subject: `[${v.topic}] Message from ${v.name.trim()}`, body: lines.join("\n") };
}

/** Validates in the browser, then opens the person's email app with the message filled in. Nothing is sent from this page. */
export function ContactForm({ to }: { to: string | null }) {
  const [v, setV] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [opened, setOpened] = useState(false);
  const toast = useToast();
  const errors = validate(v);
  const set = (k: keyof Values) => (val: string) => { setV((p) => ({ ...p, [k]: val })); setOpened(false); };
  const disabled = to === null;

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setTouched(true);
    if (disabled || Object.keys(errors).length > 0) return;
    const { subject, body } = compose(v);
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  };

  const copy = async () => {
    const { subject, body } = compose(v);
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy", "Select the text and copy it manually.");
    }
  };

  const err = (k: keyof Values) => (touched ? errors[k] : undefined);
  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5 md:p-6" aria-describedby="contact-note">
      {disabled && (
        <div role="status" className="flex items-start gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--warm)_35%,transparent)] bg-[color-mix(in_srgb,var(--warm)_8%,transparent)] px-3.5 py-3 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-warm" aria-hidden="true" />
          <span>Email contact has not been set up on this site yet, so this form is switched off. Check the help centre for answers, or try again later.</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-[13px] font-semibold text-soft">Your name
          <input className="input mt-1.5 font-normal" value={v.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" disabled={disabled} aria-invalid={!!err("name")} />
          <span className="mt-1 block min-h-4 text-xs font-normal text-down">{err("name")}</span>
        </label>
        <label className="block text-[13px] font-semibold text-soft">Your email
          <input className="input mt-1.5 font-normal" type="email" value={v.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" disabled={disabled} aria-invalid={!!err("email")} />
          <span className="mt-1 block min-h-4 text-xs font-normal text-down">{err("email")}</span>
        </label>
        <label className="block text-[13px] font-semibold text-soft">Topic
          <select className="input mt-1.5 font-normal" value={v.topic} onChange={(e) => set("topic")(e.target.value)} disabled={disabled}>
            {TOPICS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-[13px] font-semibold text-soft">Order number <span className="font-normal text-muted">(optional)</span>
          <input className="input mt-1.5 font-normal" value={v.order} onChange={(e) => set("order")(e.target.value)} disabled={disabled} />
        </label>
      </div>
      <label className="block text-[13px] font-semibold text-soft">Message
        <textarea className="input mt-1.5 min-h-36 font-normal" value={v.message} onChange={(e) => set("message")(e.target.value)} disabled={disabled} aria-invalid={!!err("message")} />
        <span className="mt-1 flex justify-between gap-3 text-xs font-normal"><span className="text-down">{err("message")}</span><span className="num text-muted">{v.message.trim().length}</span></span>
      </label>
      <p id="contact-note" className="text-xs text-muted">Sending opens your email app with this message ready to go. Nothing is sent until you press send there. Never include a recovery phrase or private key.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary" disabled={disabled}><Mail size={16} aria-hidden="true" /> Open in my email app</button>
        <button type="button" className="btn" onClick={copy} disabled={disabled || Object.keys(errors).length > 0}><Copy size={15} aria-hidden="true" /> Copy message</button>
      </div>
      {opened && <p role="status" className="fx-pop text-sm text-soft">Your email app should have opened. If it did not, copy the message and send it to <strong className="text-text">{to}</strong>. We have not received anything yet.</p>}
    </form>
  );
}
