import { describe, expect, it } from "vitest";
import { adminContacts, channelLinks, telegramUrl } from "@/lib/contacts";
import { SITE } from "@/lib/site";

describe("contacts", () => {
  it("builds a t.me link only for valid Telegram usernames", () => {
    expect(telegramUrl("Hirosihi_CEO")).toBe("https://t.me/Hirosihi_CEO");
    expect(telegramUrl("@puffnutz1919")).toBe("https://t.me/puffnutz1919");
    for (const bad of ["", "ab", "has space", "x/../y", "javascript:alert(1)", "a".repeat(40)]) expect(telegramUrl(bad)).toBeNull();
  });

  it("lists every configured admin with an @handle label and a t.me url", () => {
    const list = adminContacts();
    expect(list.map((a) => a.handle)).toEqual(SITE.admins.map((a) => a.handle));
    for (const a of list) {
      expect(a.label).toBe(`@${a.handle}`);
      expect(a.url).toBe(`https://t.me/${a.handle}`);
    }
  });

  it("exposes the official channel and Weibo", () => {
    const links = channelLinks();
    expect(links.find((l) => l.id === "telegram")?.url).toBe(SITE.telegramChannel);
    expect(links.find((l) => l.id === "weibo")?.url).toBe(SITE.weibo);
  });
});
