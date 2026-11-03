import { describe, expect, it } from "vitest";
import { actionsFor, checkTransition, LISTING_ACTIONS, LISTING_STATUSES, type ListingAction, type ListingStatus } from "@/lib/admin/transitions";

/** The complete legal table, written out by hand so a change to the source has to be deliberate. */
const LEGAL: Record<Exclude<ListingAction, "note">, Array<[ListingStatus, ListingStatus]>> = {
  approve: [["submitted", "approved"], ["pending_review", "approved"]],
  reject: [["submitted", "rejected"], ["pending_review", "rejected"], ["approved", "rejected"]],
  request_changes: [["submitted", "draft"], ["pending_review", "draft"]],
  publish: [["approved", "published"], ["suspended", "published"]],
  suspend: [["published", "suspended"]],
};

describe("listing state transitions", () => {
  for (const [action, moves] of Object.entries(LEGAL) as Array<[Exclude<ListingAction, "note">, Array<[ListingStatus, ListingStatus]>]>) {
    it(`${action}: allows exactly the legal moves and refuses every other status`, () => {
      for (const status of LISTING_STATUSES) {
        const res = checkTransition(action, status, "because reasons");
        const legal = moves.find(([from]) => from === status);
        if (legal) expect(res).toEqual({ ok: true, to: legal[1] });
        else expect(res.ok).toBe(false);
      }
    });
  }

  it("requires a reason to reject, request changes and suspend", () => {
    expect(checkTransition("reject", "pending_review", undefined)).toEqual({ ok: false, error: "A reason is required." });
    expect(checkTransition("reject", "pending_review", "  ")).toEqual({ ok: false, error: "A reason is required." });
    expect(checkTransition("request_changes", "submitted", "ab").ok).toBe(false);
    expect(checkTransition("suspend", "published", "").ok).toBe(false);
    expect(checkTransition("approve", "pending_review", undefined).ok).toBe(true);
    expect(checkTransition("publish", "approved", undefined).ok).toBe(true);
  });

  it("never lets staff move money-state or terminal listings", () => {
    for (const status of ["awaiting_payment", "payment_confirmed", "rejected", "expired", "refunded", "cancelled", "draft"] as const) {
      for (const action of LISTING_ACTIONS.filter((a) => a !== "note")) {
        expect(checkTransition(action, status, "reason here").ok, `${action} from ${status}`).toBe(false);
      }
    }
  });

  it("allows a note in every status without changing it", () => {
    for (const status of LISTING_STATUSES) expect(checkTransition("note", status, "looks fine")).toEqual({ ok: true, to: null });
  });

  it("lists the available actions for the UI from the same table", () => {
    expect(actionsFor("pending_review")).toEqual(["approve", "reject", "request_changes"]);
    expect(actionsFor("approved")).toEqual(["reject", "publish"]);
    expect(actionsFor("published")).toEqual(["suspend"]);
    expect(actionsFor("suspended")).toEqual(["publish"]);
    expect(actionsFor("rejected")).toEqual([]);
  });
});
