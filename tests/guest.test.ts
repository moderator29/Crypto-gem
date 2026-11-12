import { describe, expect, it } from "vitest";
import { guestIdFromRequest } from "@/lib/supabase/admin";

const req = (auth?: string) => new Request("http://x/api", { headers: auth ? { authorization: auth } : {} });

describe("guest identity", () => {
  it("accepts a v4 guest key and maps it to a stable owner id", () => {
    expect(guestIdFromRequest(req("Bearer guest.3f2c1a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c"))).toBe("guest_3f2c1a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c");
  });
  it("rejects anything else", () => {
    expect(guestIdFromRequest(req())).toBeNull();
    expect(guestIdFromRequest(req("Bearer guest.not-a-uuid"))).toBeNull();
    expect(guestIdFromRequest(req("Bearer eyJhbGciOiJFUzI1NiJ9.x.y"))).toBeNull();
    expect(guestIdFromRequest(req("Bearer guest.3f2c1a9e-8b7d-1c6e-9a1b-2d3e4f5a6b7c"))).toBeNull();
  });
});
