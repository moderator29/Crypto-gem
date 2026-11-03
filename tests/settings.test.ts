import { describe, expect, it } from "vitest";
import { canUnlink, loginMethodCount } from "@/lib/settings";

describe("login method guard", () => {
  it("never allows removing the last way to sign in", () => {
    expect(canUnlink([{ type: "email" }])).toBe(false);
    expect(canUnlink([{ type: "wallet" }])).toBe(false);
    expect(canUnlink([])).toBe(false);
  });
  it("allows removal when another method remains", () => {
    expect(canUnlink([{ type: "email" }, { type: "wallet" }])).toBe(true);
    expect(canUnlink([{ type: "google_oauth" }, { type: "email" }, { type: "wallet" }])).toBe(true);
  });
  it("ignores account types that cannot be used to sign in", () => {
    expect(loginMethodCount([{ type: "email" }, { type: "telegram" }, { type: "cross_app" }])).toBe(1);
    expect(canUnlink([{ type: "email" }, { type: "telegram" }])).toBe(false);
  });
});
