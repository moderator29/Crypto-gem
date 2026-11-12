"use client";

import { useEffect } from "react";

const GOOGLE_CODE: Record<string, string> = { "zh-CN": "zh-CN", "zh-TW": "zh-TW", es: "es", pt: "pt", fr: "fr", ja: "ja", ko: "ko", ar: "ar", hi: "hi", ru: "ru", tr: "tr", id: "id", vi: "vi" };

/**
 * React and in-page translation both edit the DOM. Without this guard, React can throw when a node it owns
 * was wrapped by the translator. Missing children are ignored instead of crashing the page.
 */
function guardDom(): void {
  const w = window as Window & { __cgDomGuard?: boolean };
  if (w.__cgDomGuard) return;
  w.__cgDomGuard = true;
  const remove = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return remove.call(this, child) as T;
  };
  const insert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) return insert.call(this, node, null) as T;
    return insert.call(this, node, ref) as T;
  };
}

function setCookie(value: string | null): void {
  const host = window.location.hostname;
  const base = value ? `googtrans=${value}; path=/; max-age=31536000` : "googtrans=; path=/; max-age=0";
  document.cookie = base;
  if (host.includes(".")) document.cookie = `${base}; domain=.${host.split(".").slice(-2).join(".")}`;
}

/**
 * Full-page translation for every language except English. Interface labels are translated by our own
 * dictionaries first; everything else on the page (articles, help, long copy) is machine translated in the browser.
 */
export function AutoTranslate({ locale }: { locale: string }) {
  useEffect(() => {
    const target = GOOGLE_CODE[locale];
    const had = /(?:^|;\s*)googtrans=\/en\/([^;]+)/.exec(document.cookie)?.[1] ?? null;
    if (!target) {
      if (had) {
        setCookie(null);
        window.location.reload();
      }
      return;
    }
    guardDom();
    if (had !== target) setCookie(`/en/${target}`);
    if (document.getElementById("cg-gt")) return;
    const w = window as Window & { cgGtInit?: () => void; google?: { translate?: { TranslateElement?: new (o: Record<string, unknown>, id: string) => unknown } } };
    w.cgGtInit = () => {
      const T = w.google?.translate?.TranslateElement;
      if (T) new T({ pageLanguage: "en", autoDisplay: false }, "cg-gt-host");
    };
    const host = document.createElement("div");
    host.id = "cg-gt-host";
    host.style.display = "none";
    document.body.appendChild(host);
    const s = document.createElement("script");
    s.id = "cg-gt";
    s.src = "https://translate.google.com/translate_a/element.js?cb=cgGtInit";
    s.async = true;
    document.body.appendChild(s);
  }, [locale]);
  return null;
}
