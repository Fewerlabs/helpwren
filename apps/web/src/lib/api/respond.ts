import { type ApiErrorCode } from "@helpwren/core";

const statuses: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  details_required: 422,
  rate_limited: 429,
  token_expired: 401,
  token_rejected: 401,
  identity_unavailable: 503,
};

/** A failed API response, in the one shape every route uses. */
export function apiError(code: ApiErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status: statuses[code] });
}
