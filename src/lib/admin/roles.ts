/** Staff roles, mirroring the `app_role` enum in the database. `super_admin` is implicitly allowed everywhere. */
export const STAFF_ROLES = ["listing_reviewer", "advertising_manager", "support_agent", "admin", "super_admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(r: string): r is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(r);
}

/** Role sets per capability. Used by routes (enforcement) and the UI (navigation only). */
export const ACCESS = {
  overview: ["listing_reviewer", "advertising_manager", "support_agent", "admin"],
  listingsRead: ["listing_reviewer", "support_agent", "admin"],
  listingsWrite: ["listing_reviewer", "admin"],
  pricesRead: ["advertising_manager", "admin"],
  pricesCatalog: ["admin"],
  pricesPlacements: ["advertising_manager", "admin"],
  paymentMethods: ["admin"],
  payments: ["support_agent", "admin"],
  creatives: ["advertising_manager", "admin"],
  audit: ["admin"],
} as const satisfies Record<string, readonly StaffRole[]>;

/** True when any of the user's roles satisfies the allowed set. `super_admin` always passes. */
export function hasAnyRole(userRoles: readonly string[], allowed: readonly StaffRole[]): boolean {
  return userRoles.includes("super_admin") || allowed.some((r) => userRoles.includes(r));
}
