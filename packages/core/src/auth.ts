import { z } from "zod";

import { type Agent, type AgentsApi } from "./agents";
import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

export const LOGIN_CODE_LENGTH = 6;

// Tidied before it is checked, so a stray space or capital does not make an address invalid.
export const loginEmailSchema = z.string().trim().toLowerCase().pipe(z.email());
export const loginCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`));

export type VerifyLoginCodeResult =
  { ok: true; agent: Agent } | { ok: false; reason: "invalid_code" | "not_an_agent" };

/** Supabase Auth keeps passwords as bcrypt hashes, which read only the first 72 bytes. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** A password someone chooses. Never trimmed: a space is part of it. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_LENGTH);

export type PasswordSignInResult =
  { ok: true; agent: Agent } | { ok: false; reason: "invalid_credentials" | "not_an_agent" };

export type SetPasswordResult = { ok: true } | { ok: false; reason: "weak" | "same" };

/** Supabase's error code when a code is requested for an email that has no account. */
const UNKNOWN_EMAIL = "otp_disabled";

/** Supabase's error code for a sign-in code that is wrong, already used or out of date. */
const REJECTED_CODE = "otp_expired";

/** Supabase's error code for an email and password that do not match an account. */
const WRONG_PASSWORD = "invalid_credentials";

export function createAuth(supabase: HelpwrenSupabaseClient, agents: AgentsApi) {
  /** After Supabase accepts someone: an active agent, or signed out again. */
  async function activeAgentOrSignOut(): Promise<
    { ok: true; agent: Agent } | { ok: false; reason: "not_an_agent" }
  > {
    const agent = await agents.me();
    if (agent) return { ok: true, agent };
    // "local" ends this session only.
    await supabase.auth.signOut({ scope: "local" });
    return { ok: false, reason: "not_an_agent" };
  }

  return {
    /**
     * Emails a sign-in code to a team member. Resolves in the same way whether or not the
     * email belongs to someone, so it cannot be used to find out who is on the team. Accounts
     * are never created here: team members are invited.
     */
    async sendLoginCode(email: string): Promise<void> {
      const { error } = await supabase.auth.signInWithOtp({
        email: loginEmailSchema.parse(email),
        options: { shouldCreateUser: false },
      });

      if (error && error.code !== UNKNOWN_EMAIL) {
        throw new HelpwrenError("Could not send the sign-in code.", { cause: error });
      }
    },

    /**
     * Exchanges a sign-in code for a session. Someone who has an account but is not an active
     * agent is signed straight out again.
     */
    async verifyLoginCode(email: string, code: string): Promise<VerifyLoginCodeResult> {
      const parsedCode = loginCodeSchema.safeParse(code);
      if (!parsedCode.success) return { ok: false, reason: "invalid_code" };

      const { error } = await supabase.auth.verifyOtp({
        email: loginEmailSchema.parse(email),
        token: parsedCode.data,
        type: "email",
      });

      if (error) {
        if (error.code === REJECTED_CODE) return { ok: false, reason: "invalid_code" };
        throw new HelpwrenError("Could not check the sign-in code.", { cause: error });
      }

      return activeAgentOrSignOut();
    },

    /**
     * Signs a team member in with their password. Says only that the pair does not match, never
     * which half is wrong, and someone who is not an active agent is signed straight out again.
     */
    async signInWithPassword(email: string, password: string): Promise<PasswordSignInResult> {
      const parsedEmail = loginEmailSchema.safeParse(email);
      if (!parsedEmail.success || password === "") {
        return { ok: false, reason: "invalid_credentials" };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: parsedEmail.data,
        password,
      });

      if (error) {
        if (error.code === WRONG_PASSWORD) return { ok: false, reason: "invalid_credentials" };
        throw new HelpwrenError("Could not sign in.", { cause: error });
      }
      return activeAgentOrSignOut();
    },

    /** Sets the signed-in team member's own password, replacing any they had. */
    async setPassword(password: string): Promise<SetPasswordResult> {
      if (!passwordSchema.safeParse(password).success) return { ok: false, reason: "weak" };

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.code === "weak_password") return { ok: false, reason: "weak" };
        if (error.code === "same_password") return { ok: false, reason: "same" };
        throw new HelpwrenError("Could not change the password.", { cause: error });
      }
      return { ok: true };
    },

    async signOut(): Promise<void> {
      // "local" ends this session only, so signing out here leaves other devices signed in.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw new HelpwrenError("Could not sign out.", { cause: error });
    },
  };
}

export type AuthApi = ReturnType<typeof createAuth>;
