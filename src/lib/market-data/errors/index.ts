export type ProviderErrorKind =
  | "rate_limited"
  | "timeout"
  | "unauthorized"
  | "not_found"
  | "unavailable"
  | "bad_response"
  | "circuit_open"
  | "not_configured";

export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly kind: ProviderErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
