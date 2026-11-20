import { verifyAccessToken } from "@/lib/tokens";
import { findUser } from "@/lib/users";

/**
 * Glown's "who am I" address (`GET /auth/me`), answering in the shape its API uses for every
 * response. Helpwren's profile endpoint option calls it with the token the page handed over,
 * and maps `data.id`, `data.firstName`, `data.business.id` and the rest onto the contact.
 *
 * - 401 when the token is missing, forged or expired. Helpwren reads this as "expired", and
 *   the widget asks the page for a fresh token once.
 * - 403 when the account is blocked. Helpwren reads this as "rejected".
 */
export async function GET(request: Request): Promise<Response> {
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  const verified = token ? await verifyAccessToken(token) : null;
  if (!verified?.ok) {
    return Response.json(
      {
        status: "error",
        message: verified?.expired ? "JWT token has expired" : "Invalid JWT token",
      },
      { status: 401 },
    );
  }

  const user = findUser(verified.claims.userId);
  if (!user) return Response.json({ status: "error", message: "Unknown user" }, { status: 401 });
  if (user.blocked) {
    return Response.json({ status: "error", message: "This account is blocked" }, { status: 403 });
  }

  return Response.json({
    status: "success",
    message: "Request processed successfully",
    data: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      type: user.type,
      business: user.business,
    },
  });
}
