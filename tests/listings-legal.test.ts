import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

const pages = [
  ["privacy", () => import("@/app/privacy/page")],
  ["terms", () => import("@/app/terms/page")],
  ["about", () => import("@/app/about/page")],
] as const;

describe("legal pages", () => {
  it.each(pages)("%s renders to HTML with a contents list and no draft banner", async (_name, load) => {
    const mod = await load();
    expect(typeof mod.default).toBe("function");
    const html = renderToString(createElement(mod.default));
    expect(html).toContain("Last updated");
    expect(html).toContain('aria-label="Contents"');
    expect(html).toContain("OWNER PLACEHOLDERS");
    expect(html).not.toMatch(/draft for legal review/i);
    expect(html).not.toContain(String.fromCharCode(8212));
  });

  it("terms mark the owner-confirmed placeholders", async () => {
    const mod = await import("@/app/terms/page");
    const html = renderToString(createElement(mod.default));
    expect(html).toContain("Refund policy");
    expect(html).toContain("to be confirmed");
  });
});
