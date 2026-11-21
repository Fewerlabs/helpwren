import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { describe, expect, it } from "vitest";

import { auth } from "./auth.ts";
import { InstallError } from "./context.ts";
import { MissingAnswerError, unattendedPrompter } from "./io.ts";
import { makeContext, makeRoot, scriptedPrompter } from "./test-support.ts";

const HOSTED = "https://abcdefghijklmnopqrst.supabase.co";

function withEnvFile(root: string, text: string) {
  const { ctx } = makeContext(root);
  mkdirSync(dirname(ctx.paths.webEnv), { recursive: true });
  writeFileSync(ctx.paths.webEnv, text);
}

function recordingFetch(status = 200) {
  const requests: { url: string; body: unknown; auth: string | null }[] = [];
  const fetch = (url: string, init: RequestInit) => {
    requests.push({
      url,
      body: JSON.parse(typeof init.body === "string" ? init.body : "{}") as unknown,
      auth: new Headers(init.headers).get("Authorization"),
    });
    return Promise.resolve(new Response(null, { status }));
  };
  return { fetch, requests };
}

describe("pnpm helpwren auth", () => {
  it("sets the Auth settings on the project the env file names, asking only for the token", async () => {
    const root = makeRoot();
    withEnvFile(
      root,
      `NEXT_PUBLIC_SUPABASE_URL=${HOSTED}\nNEXT_PUBLIC_APP_URL=https://support.example.com\n`,
    );
    const { fetch, requests } = recordingFetch();
    const prompt = scriptedPrompter({
      "project URL": "",
      "Helpwren is reached": "",
      token: "sbp_x",
    });
    const { ctx, printed } = makeContext(root, { fetch, prompt });

    await auth(ctx, {});

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: "https://api.supabase.com/v1/projects/abcdefghijklmnopqrst/config/auth",
      auth: "Bearer sbp_x",
      body: {
        site_url: "https://support.example.com",
        external_anonymous_users_enabled: true,
        mailer_otp_length: 6,
        mailer_templates_magic_link_content: "<p>{{ .Token }}</p>",
      },
    });
    expect(printed.join("\n")).toContain("Sign-in codes in the email");
  });

  it("takes everything from flags, for CI", async () => {
    const { fetch, requests } = recordingFetch();
    const { ctx } = makeContext(makeRoot(), { fetch, prompt: unattendedPrompter() });

    await auth(ctx, {
      supabaseUrl: HOSTED,
      appUrl: "https://support.example.com",
      accessToken: "sbp_x",
    });

    expect(requests).toHaveLength(1);
  });

  it("stops in CI without a token, before asking Supabase anything", async () => {
    const { fetch, requests } = recordingFetch();
    const { ctx } = makeContext(makeRoot(), { fetch, prompt: unattendedPrompter() });

    await expect(
      auth(ctx, { supabaseUrl: HOSTED, appUrl: "https://support.example.com" }),
    ).rejects.toBeInstanceOf(MissingAnswerError);
    expect(requests).toHaveLength(0);
  });

  it("refuses a local or self-hosted Supabase, which takes these from its own files", async () => {
    const { ctx } = makeContext(makeRoot(), { prompt: unattendedPrompter() });

    await expect(
      auth(ctx, { supabaseUrl: "http://127.0.0.1:54321", appUrl: "x", accessToken: "y" }),
    ).rejects.toThrow(/not a hosted Supabase project/);
  });

  it("says when Supabase refuses the change", async () => {
    const { fetch } = recordingFetch(401);
    const { ctx } = makeContext(makeRoot(), { fetch, prompt: unattendedPrompter() });

    await expect(
      auth(ctx, { supabaseUrl: HOSTED, appUrl: "https://s.example.com", accessToken: "bad" }),
    ).rejects.toBeInstanceOf(InstallError);
  });
});
