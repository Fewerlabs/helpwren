import { InboundEmailError } from "@helpwren/adapters";
import { inboundProviderSchema } from "@helpwren/core";

import { apiError } from "@/lib/api/respond";
import { getInboundAdapter, getInboundSettings, receiveEmail } from "@/lib/email/inbound";

/**
 * Where a mail provider hands over an email sent to the reply address: Resend, Postmark, or
 * anything that posts the generic signed JSON. Only the provider chosen in Settings > Email, with
 * replying by email on, has an address here.
 *
 * A request without the provider's proof is refused with 401. Once it has that, the answer is
 * 200 whatever became of the email, so the provider does not send it again; what happened is in
 * the body for whoever reads the provider's logs, and the reason for a refusal is in the server's.
 * The person who wrote the email never sees this answer, so it tells them nothing.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/email/inbound/[provider]">,
): Promise<Response> {
  const provider = inboundProviderSchema.safeParse((await params).provider);
  const settings = await getInboundSettings();
  if (!provider.success || !settings.enabled || settings.provider !== provider.data) {
    return apiError("not_found", "Replies by email are not received here.");
  }
  const adapter = await getInboundAdapter(provider.data);
  if (!adapter) return apiError("not_found", "Replies by email are not set up yet.");

  // The body exactly as sent: signatures cover its bytes.
  const signed = { body: await request.text(), headers: request.headers };
  if (!adapter.verify(signed)) {
    return apiError("unauthorized", "The request is not signed by the provider.");
  }

  let email;
  try {
    email = await adapter.parse(signed);
  } catch (error) {
    if (error instanceof InboundEmailError) return apiError("invalid_request", error.message);
    throw error;
  }

  const result = await receiveEmail(email, settings);
  if (result.outcome === "ignored") {
    console.warn(`Inbound email from ${provider.data} ignored: ${result.reason}.`);
  }
  return Response.json({ outcome: result.outcome });
}
