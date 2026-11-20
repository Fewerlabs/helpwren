import { describe, expect, it, vi } from "vitest";

import { createTurnstile } from "./turnstile";

function answering(body: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));
}

describe("createTurnstile", () => {
  it("sends the secret, the token and the network, and trusts Cloudflare's answer", async () => {
    const send = answering({ success: true });
    const captcha = createTurnstile({ secretKey: "s3cret", fetch: send });
    expect(await captcha.verify("token-1", "203.0.113.9")).toBe(true);
    const body = send.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    expect((body as URLSearchParams).toString()).toBe(
      "secret=s3cret&response=token-1&remoteip=203.0.113.9",
    );
  });

  it("refuses a token Cloudflare rejects", async () => {
    const captcha = createTurnstile({ secretKey: "s", fetch: answering({ success: false }) });
    expect(await captcha.verify("used")).toBe(false);
  });

  it("refuses without asking when there is no token", async () => {
    const send = answering({ success: true });
    expect(await createTurnstile({ secretKey: "s", fetch: send }).verify("")).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses when Cloudflare cannot be reached or answers oddly", async () => {
    const down = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    expect(await createTurnstile({ secretKey: "s", fetch: down }).verify("t")).toBe(false);
    const odd = answering({ nothing: true });
    expect(await createTurnstile({ secretKey: "s", fetch: odd }).verify("t")).toBe(false);
    const failed = answering({ success: true }, 500);
    expect(await createTurnstile({ secretKey: "s", fetch: failed }).verify("t")).toBe(false);
  });
});
