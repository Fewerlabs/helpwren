"use server";

import { endpointUrlSchema } from "@helpwren/adapters/settings";
import { revalidatePath, revalidateTag } from "next/cache";

import { getCurrentAgent } from "@/features/agent-auth";
import { sendEmail } from "@/lib/email";
import { createInboundSecret, saveResendInbound } from "@/lib/email/inbound";
import { HELP_CENTER_TAG } from "@/lib/help-center-cache";
import { getHelpwren } from "@/lib/helpwren";
import {
  createSigningKey,
  removeSigningKey,
  saveIdentitySettings,
  testIdentityToken,
  type IdentityTestResult,
} from "@/lib/identity";
import {
  createWebhookSecret,
  saveExpoAccessToken,
  savePushSettings,
  saveServiceAccount,
  sendTestWebhook,
} from "@/lib/push";

import {
  brandingSchema,
  emailSchema,
  type EmailValues,
  brandingToSettings,
  generalSchema,
  identityFromValues,
  identitySchema,
  mobileSchema,
  serviceAccountFrom,
  installationSchema,
  inviteSchema,
  memberChangeSchema,
  profileSchema,
  type BrandingValues,
  type GeneralValues,
  type IdentityValues,
  type MobileValues,
  type InstallationValues,
  type InviteValues,
  type MemberChange,
  type ProfileValues,
} from "./schemas";
import {
  changeTeamMember,
  inviteTeamMember,
  updateOwnProfile,
  type ChangeMemberResult,
  type InviteResult,
} from "./server/team";

export type SaveResult = { ok: true } | { ok: false; reason: "forbidden" | "invalid" };

const SETTINGS_PATH = "/dashboard/settings";

/** Saves the general settings. The database refuses anyone who is not an admin. */
export async function saveGeneral(values: GeneralValues): Promise<SaveResult> {
  const parsed = generalSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const helpwren = await getHelpwren();
  const result = await helpwren.settings.update({
    guestDetails: parsed.data.guestDetails,
    tickets: { fromChat: parsed.data.ticketsFromChat },
    visitors: { tracking: parsed.data.trackVisitors, liveList: parsed.data.liveVisitors },
    spam: {
      captcha: parsed.data.captcha ? "turnstile" : "off",
      ...(parsed.data.captchaSiteKey ? { siteKey: parsed.data.captchaSiteKey } : {}),
    },
  });
  if (result.ok) {
    revalidatePath(SETTINGS_PATH, "layout");
    // The dashboard's sidebar shows the Visitors section only while its list is on.
    revalidatePath("/dashboard", "layout");
  }
  return result;
}

/** Saves the brand, and how the widget, the chat page and the help center wear it. */
export async function saveBranding(values: BrandingValues): Promise<SaveResult> {
  const parsed = brandingSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const helpwren = await getHelpwren();
  const result = await helpwren.settings.update(brandingToSettings(parsed.data));
  if (result.ok) {
    revalidatePath(SETTINGS_PATH, "layout");
    // The help center keeps the brand for a minute, and should wear the new one at once.
    revalidateTag(HELP_CENTER_TAG, { expire: 0 });
  }
  return result;
}

/** Changes the signed-in team member's own name and photo. */
export async function saveProfile(values: ProfileValues): Promise<SaveResult> {
  const caller = await getCurrentAgent();
  if (!caller) return { ok: false, reason: "forbidden" };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const saved = await updateOwnProfile(caller, parsed.data);
  if (!saved) return { ok: false, reason: "invalid" };
  // The name is in the sidebar, on every dashboard page.
  revalidatePath("/dashboard", "layout");
  // A changed name or photo is also the byline on the articles this person wrote.
  revalidateTag(HELP_CENTER_TAG, { expire: 0 });
  return { ok: true };
}

export async function saveInstallation(values: InstallationValues): Promise<SaveResult> {
  const parsed = installationSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const helpwren = await getHelpwren();
  const result = await helpwren.settings.update({ allowedDomains: parsed.data.allowedDomains });
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
}

export async function inviteMember(
  values: InviteValues,
): Promise<InviteResult | { ok: false; reason: "invalid" }> {
  const caller = await getCurrentAgent();
  if (!caller) return { ok: false, reason: "forbidden" };
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const result = await inviteTeamMember(caller, parsed.data);
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
}

export async function changeMember(id: string, change: MemberChange): Promise<ChangeMemberResult> {
  const caller = await getCurrentAgent();
  if (!caller) return { ok: false, reason: "forbidden" };
  const parsed = memberChangeSchema.safeParse({ id, change });
  if (!parsed.success) return { ok: false, reason: "not_found" };

  const result = await changeTeamMember(caller, parsed.data.id, parsed.data.change);
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
}

/**
 * Saves who the install's emails are from and how replies come back. The database refuses
 * anyone who is not an admin; the Resend secrets, written with the secret key, are checked here.
 */
export async function saveEmail(values: EmailValues): Promise<SaveResult> {
  const parsed = emailSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { fromName, fromAddress, replies, status, inboundEnabled, replyAddress } = parsed.data;
  const { inboundProvider, resendSigningSecret, resendApiKey } = parsed.data;
  // Replies cannot come back without an address to come back to.
  if (inboundEnabled && !replyAddress) return { ok: false, reason: "invalid" };
  const secretsGiven = resendSigningSecret !== "" || resendApiKey !== "";
  if (secretsGiven && !(await isAdmin())) return { ok: false, reason: "forbidden" };

  const helpwren = await getHelpwren();
  const result = await helpwren.settings.update({
    email: {
      replies,
      status,
      ...(fromName ? { fromName } : {}),
      ...(fromAddress ? { fromAddress } : {}),
      inbound: {
        enabled: inboundEnabled,
        provider: inboundProvider,
        ...(replyAddress ? { address: replyAddress } : {}),
      },
    },
  });
  if (result.ok && secretsGiven) await saveResendInbound(resendSigningSecret, resendApiKey);
  if (result.ok) revalidatePath(SETTINGS_PATH, "layout");
  return result;
}

/**
 * Makes the secret Postmark's webhook address or the generic adapter's signature uses,
 * replacing the old one. Shown this once.
 */
export async function makeInboundSecret(): Promise<WebhookSecretResult> {
  if (!(await isAdmin())) return { ok: false, reason: "forbidden" };
  const secret = await createInboundSecret();
  revalidatePath(SETTINGS_PATH, "layout");
  return { ok: true, secret };
}

export type TestEmailResult = { ok: true } | { ok: false; detail: string };

/**
 * Sends one email to the signed-in admin's own address, to prove the provider and the sender
 * work. Only to themselves, so it cannot be used to send mail to anyone else.
 */
export async function sendTestEmail(): Promise<TestEmailResult> {
  const caller = await getCurrentAgent();
  if (caller?.role !== "admin") return { ok: false, detail: "Only admins can send a test email." };

  const result = await sendEmail({
    to: caller.email,
    subject: "A test email from Helpwren",
    text: "If you are reading this, your Helpwren install can send email.",
  });
  return result.ok ? { ok: true } : { ok: false, detail: result.detail };
}

/** Only admins: these are written with the secret key, so the database cannot check them. */
async function isAdmin(): Promise<boolean> {
  const caller = await getCurrentAgent();
  return caller?.role === "admin";
}

/** Saves how the install identifies its users. */
export async function saveIdentity(values: IdentityValues): Promise<SaveResult> {
  if (!(await isAdmin())) return { ok: false, reason: "forbidden" };
  const parsed = identitySchema.safeParse(values);
  const settings = parsed.success ? identityFromValues(parsed.data) : null;
  if (!settings) return { ok: false, reason: "invalid" };

  await saveIdentitySettings(settings);
  revalidatePath(SETTINGS_PATH, "layout");
  return { ok: true };
}

/**
 * Checks a token the way the chat would, with what is on the page now, saved or not. It signs
 * nobody in and stores nothing: it says who the token is for, or why it was not accepted.
 */
export async function tryIdentityToken(
  values: IdentityValues,
  token: string,
): Promise<IdentityTestResult> {
  if (!(await isAdmin())) return { ok: false, detail: "Only admins can test a token." };
  const parsed = identitySchema.safeParse(values);
  const settings = parsed.success ? identityFromValues(parsed.data) : null;
  if (!settings) return { ok: false, detail: "Fix the settings above first." };
  const trimmed = token.trim();
  if (trimmed === "") return { ok: false, detail: "Paste a token to test." };
  return testIdentityToken(settings, trimmed);
}

export type CreateKeyResult =
  { ok: true; key: { id: string; secret: string } } | { ok: false; reason: "forbidden" | "full" };

/** Makes a signing key. Its secret is in the answer, and never shown again after that. */
export async function createIdentityKey(): Promise<CreateKeyResult> {
  if (!(await isAdmin())) return { ok: false, reason: "forbidden" };
  const key = await createSigningKey();
  if (!key) return { ok: false, reason: "full" };
  revalidatePath(SETTINGS_PATH, "layout");
  return { ok: true, key };
}

/** Tokens signed with the key stop working at once. */
export async function removeIdentityKey(id: string): Promise<SaveResult> {
  if (!(await isAdmin())) return { ok: false, reason: "forbidden" };
  await removeSigningKey(id);
  revalidatePath(SETTINGS_PATH, "layout");
  return { ok: true };
}

/** Saves how the install reaches phones. A secret given replaces the saved one. */
export async function saveMobile(values: MobileValues): Promise<SaveResult> {
  if (!(await isAdmin())) return { ok: false, reason: "forbidden" };
  const parsed = mobileSchema.safeParse(values);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { expo, fcm, webhook, webhookUrl, accessToken, serviceAccount } = parsed.data;

  if (accessToken !== "") await saveExpoAccessToken(accessToken);
  if (serviceAccount !== "" && !(await saveServiceAccount(serviceAccountFrom(serviceAccount)))) {
    return { ok: false, reason: "invalid" };
  }
  await savePushSettings({ expo, fcm, webhook: webhook ? { url: webhookUrl } : null });
  revalidatePath(SETTINGS_PATH, "layout");
  return { ok: true };
}

export type PushSecret = "expoAccessToken" | "serviceAccount";

/** Forgets a saved push secret. */
export async function removePushSecret(secret: PushSecret): Promise<SaveResult> {
  if (!(await isAdmin())) return { ok: false, reason: "forbidden" };
  if (secret === "expoAccessToken") await saveExpoAccessToken(null);
  else await saveServiceAccount(null);
  revalidatePath(SETTINGS_PATH, "layout");
  return { ok: true };
}

export type WebhookSecretResult = { ok: true; secret: string } | { ok: false; reason: "forbidden" };

/** Makes a new signing secret for the webhook, replacing the old one. Shown this once. */
export async function makeWebhookSecret(): Promise<WebhookSecretResult> {
  if (!(await isAdmin())) return { ok: false, reason: "forbidden" };
  const secret = await createWebhookSecret();
  revalidatePath(SETTINGS_PATH, "layout");
  return { ok: true, secret };
}

/** Sends a signed test event to a webhook address, to see the product's backend take it. */
export async function testWebhook(url: string): Promise<TestEmailResult> {
  if (!(await isAdmin())) return { ok: false, detail: "Only admins can send a test." };
  const parsed = endpointUrlSchema.safeParse(url);
  if (!parsed.success) return { ok: false, detail: "Enter the webhook's address first." };
  return sendTestWebhook(parsed.data);
}
