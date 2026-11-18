/** One email to send. Who it is from is the install's own setting, so it is not given here. */
export interface EmailMessage {
  to: string;
  subject: string;
  /** The plain words of the email. Always given, for clients that show no HTML. */
  text: string;
  html?: string | undefined;
  /** Where a reply should go, when it is not the sender. */
  replyTo?: string | undefined;
}

/** Who an email is from: the install's name and its sending address. */
export interface EmailSender {
  name: string;
  address: string;
}

export type SendResult =
  | { ok: true }
  /**
   * `rejected`: the provider answered and refused, for example a bad address or a sender that
   * is not verified. `failed`: it could not be reached. `detail` is the provider's own words,
   * for an admin to read; never show it to a visitor.
   */
  | { ok: false; reason: "rejected" | "failed"; detail: string };

/**
 * One way of sending mail. An install picks one with `EMAIL_PROVIDER`; adding a provider means
 * writing one of these and naming it in `createEmailAdapter`.
 */
export interface EmailAdapter {
  /** What an admin sees as the way mail is sent, such as "SMTP". */
  name: string;
  send: (message: EmailMessage, from: EmailSender) => Promise<SendResult>;
}
