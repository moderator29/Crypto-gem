"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Spotlight } from "@/components/fx/Spotlight";
import { Tilt } from "@/components/fx/Tilt";
import { TOOLS } from "@/lib/tools/registry";
import { ToolGlyph } from "./ToolGlyph";

/** Card grid linking to every calculator. Cards tilt toward the pointer and light up under it. */
export function ToolsHub() {
  return (
    <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.map((t) => (
        <li key={t.slug}>
          <Tilt className="h-full">
            <Spotlight className="card hover-lift h-full">
              <Link href={`/tools/${t.slug}`} className="flex h-full flex-col gap-3 p-5">
                <span className="icon-tile grid h-11 w-11 place-items-center rounded-xl"><ToolGlyph icon={t.icon} size={22} /></span>
                <h2 className="h3">{t.title}</h2>
                <p className="flex-1 text-sm text-soft">{t.blurb}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">Open calculator <ArrowRight size={15} aria-hidden="true" /></span>
              </Link>
            </Spotlight>
          </Tilt>
        </li>
      ))}
    </ul>
  );
}
