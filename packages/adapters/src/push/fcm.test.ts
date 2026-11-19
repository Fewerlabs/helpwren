import { exportPKCS8, generateKeyPair, jwtVerify } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createFcmPush, isFcmToken, serviceAccountSchema, type ServiceAccount } from "./fcm";
import { type PushMessage } from "./types";

let account: ServiceAccount;
let publicKey: CryptoKey;

beforeAll(async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  publicKey = keys.publicKey;
  account = serviceAccountSchema.parse({
    type: "service_account",
    project_id: "acme-app",
    client_email: "helpwren@acme-app.iam.gserviceaccount.com",
    private_key: await exportPKCS8(keys.privateKey),
  });
});

const TOKEN = `fcm-${"a".repeat(40)}`;

function message(to = TOKEN): PushMessage {
  return {
    to,
    title: "Acme",
    body: "It went out this morning.",
    data: { type: "support", conversationId: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff" },
    group: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
    badge: 2,
  };
}

/** Google's token address and FCM, answering as told. */
function google(sendAnswers: { status: number; body: unknown }[] = []) {
  const answers = [...sendAnswers];
  return vi.fn((input: string | URL | Request, _init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url === "https://oauth2.googleapis.com/token") {
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: "google-access-token", expires_in: 3599 })),
      );
    }
    const answer = answers.shift() ?? {
      status: 200,
      body: { name: "projects/acme-app/messages/1" },
    };
    return Promise.resolve(new Response(JSON.stringify(answer.body), { status: answer.status }));
  });
}

describe("the Firebase push adapter", () => {
  it("signs in as the service account, then sends one grouped notification", async () => {
    const fetch = google();
    const push = createFcmPush({ serviceAccount: account, fetch });

    await expect(push.send([message()])).resolves.toEqual([{ ok: true, id: null }]);

    // The access token is asked for with a JWT the account's key signed.
    const [tokenUrl, tokenInit] = fetch.mock.calls[0] ?? [];
    expect(tokenUrl).toBe("https://oauth2.googleapis.com/token");
    const form = new URLSearchParams(tokenInit?.body as string);
    expect(form.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    const { payload } = await jwtVerify(form.get("assertion") ?? "", publicKey, {
      issuer: account.client_email,
      audience: "https://oauth2.googleapis.com/token",
    });
    expect(payload.scope).toBe("https://www.googleapis.com/auth/firebase.messaging");

    const [sendUrl, sendInit] = fetch.mock.calls[1] ?? [];
    expect(sendUrl).toBe("https://fcm.googleapis.com/v1/projects/acme-app/messages:send");
    expect(sendInit?.headers).toMatchObject({ authorization: "Bearer google-access-token" });
    expect(JSON.parse(sendInit?.body as string)).toEqual({
      message: {
        token: TOKEN,
        notification: { title: "Acme", body: "It went out this morning." },
        data: { type: "support", conversationId: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff" },
        android: {
          priority: "high",
          collapse_key: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
          notification: { tag: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff", notification_count: 2 },
        },
        apns: {
          headers: { "apns-collapse-id": "6f9619ff-8b86-4d01-b42d-00cf4fc964ff" },
          payload: { aps: { sound: "default", badge: 2 } },
        },
      },
    });
  });

  it("keeps its access token for the next run", async () => {
    const fetch = google();
    const push = createFcmPush({ serviceAccount: account, fetch });

    await push.send([message()]);
    await push.send([message()]);

    const tokenCalls = fetch.mock.calls.filter(
      ([url]) => url === "https://oauth2.googleapis.com/token",
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it("forgets a device whose token is unregistered or invalid, and only fails the others", async () => {
    const fcmError = (status: number, errorCode: string) => ({
      status,
      body: {
        error: {
          code: status,
          status: errorCode === "UNREGISTERED" ? "NOT_FOUND" : errorCode,
          message: "Requested entity was not found.",
          details: [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode }],
        },
      },
    });
    const fetch = google([
      fcmError(404, "UNREGISTERED"),
      fcmError(400, "INVALID_ARGUMENT"),
      fcmError(429, "QUOTA_EXCEEDED"),
    ]);

    const tickets = await createFcmPush({ serviceAccount: account, fetch }).send([
      message(),
      message(),
      message(),
    ]);

    expect(tickets.map((ticket) => (ticket.ok ? "ok" : ticket.reason))).toEqual([
      "gone",
      "gone",
      "failed",
    ]);
  });

  it("throws when Google refuses the service account, so the run is tried again", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })),
    );
    await expect(
      createFcmPush({ serviceAccount: account, fetch }).send([message()]),
    ).rejects.toThrow("Google refused the service account");
  });

  it("has no receipts to ask for", async () => {
    const push = createFcmPush({ serviceAccount: account, fetch: google() });
    await expect(push.receipts(["anything"])).resolves.toEqual(new Map());
  });

  it("knows a service account key file, and a Firebase token", () => {
    expect(serviceAccountSchema.safeParse({ type: "authorized_user" }).success).toBe(false);
    expect(isFcmToken(`dGVzdA:APA91b${"x".repeat(140)}`)).toBe(true);
    expect(isFcmToken("ExponentPushToken[abc]")).toBe(false);
    expect(isFcmToken("short")).toBe(false);
  });
});
