import { createResendAdapter } from "./resend";
import { createSmtpAdapter } from "./smtp";
import { type EmailAdapter } from "./types";

export interface EmailSetup {
  provider?: string | undefined;
  smtpUrl?: string | undefined;
  resendApiKey?: string | undefined;
}

export interface EmailChoice {
  adapter: EmailAdapter | null;
  /** Why the chosen provider cannot be used, in words safe to show an admin. */
  problem: string | null;
}

/**
 * The adapter the server's settings ask for. A provider that is chosen but cannot be built is
 * reported rather than thrown, so a settings page can say what is wrong instead of failing.
 * The problem never repeats `SMTP_URL`, which holds a password.
 */
export function chooseEmailAdapter(setup: EmailSetup): EmailChoice {
  if (setup.provider === "smtp" && setup.smtpUrl) {
    try {
      return { adapter: createSmtpAdapter(setup.smtpUrl), problem: null };
    } catch {
      return {
        adapter: null,
        problem:
          "SMTP_URL could not be read. Percent-encode special characters in the username and password, such as # as %23, / as %2F and ? as %3F.",
      };
    }
  }
  if (setup.provider === "resend" && setup.resendApiKey) {
    return { adapter: createResendAdapter(setup.resendApiKey), problem: null };
  }
  return { adapter: null, problem: null };
}
