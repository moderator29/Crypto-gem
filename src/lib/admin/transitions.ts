export const LISTING_STATUSES = ["draft", "submitted", "pending_review", "approved", "awaiting_payment", "payment_confirmed", "published", "rejected", "expired", "refunded", "cancelled", "suspended"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_ACTIONS = ["approve", "reject", "request_changes", "publish", "suspend", "note"] as const;
export type ListingAction = (typeof LISTING_ACTIONS)[number];

interface Rule {
  from: readonly ListingStatus[];
  /** Status after the action. `null` means the action does not change status. */
  to: ListingStatus | null;
  /** The action cannot be taken without a written reason. */
  reasonRequired: boolean;
}

/**
 * The only legal moves a reviewer can make. Anything not listed is refused.
 * Payment moves (awaiting_payment to pending_review) belong to the webhook, not to staff.
 * `publish` from `suspended` is the reinstate path.
 */
export const TRANSITIONS: Record<ListingAction, Rule> = {
  approve: { from: ["submitted", "pending_review"], to: "approved", reasonRequired: false },
  reject: { from: ["submitted", "pending_review", "approved"], to: "rejected", reasonRequired: true },
  request_changes: { from: ["submitted", "pending_review"], to: "draft", reasonRequired: true },
  publish: { from: ["approved", "suspended"], to: "published", reasonRequired: false },
  suspend: { from: ["published"], to: "suspended", reasonRequired: true },
  note: { from: LISTING_STATUSES, to: null, reasonRequired: true },
};

export type TransitionCheck = { ok: true; to: ListingStatus | null } | { ok: false; error: string };

/** Validate one action against the current status and the reason supplied. */
export function checkTransition(action: ListingAction, from: string, reason: string | undefined): TransitionCheck {
  const rule = TRANSITIONS[action];
  if (!(rule.from as readonly string[]).includes(from)) return { ok: false, error: `Cannot ${action.replace("_", " ")} a listing that is ${from.replace("_", " ")}.` };
  if (rule.reasonRequired && !(reason && reason.trim().length >= 3)) return { ok: false, error: "A reason is required." };
  return { ok: true, to: rule.to };
}

/** Actions currently available for a status. Drives the UI buttons and mirrors server enforcement. */
export function actionsFor(status: string): ListingAction[] {
  return LISTING_ACTIONS.filter((a) => a !== "note" && (TRANSITIONS[a].from as readonly string[]).includes(status));
}
