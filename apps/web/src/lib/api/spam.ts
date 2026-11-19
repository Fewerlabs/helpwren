/**
 * Less than this between opening a form with fields to fill and sending it is a script that
 * fills fields and submits at once. Set low: a browser driven by the end-to-end tests takes
 * about 200 ms, and a person far longer, so a higher bar would fail the tests and catch no
 * more people than bots. The hidden field and the captcha do the rest.
 */
export const MIN_FORM_MS = 100;

/**
 * Why a form looks sent by a bot, or `null` if it does not: the field nobody sees was filled
 * in, or it was sent faster than anyone types. These catch the careless bots that are most of
 * them; the captcha, when it is on, and the limits catch the rest.
 */
export function botReason(input: {
  honeypot?: string | undefined;
  elapsedMs?: number | undefined;
}) {
  if (input.honeypot && input.honeypot.trim() !== "") return "A hidden field was filled in.";
  if (input.elapsedMs !== undefined && input.elapsedMs < MIN_FORM_MS) {
    return "The form was sent too quickly.";
  }
  return null;
}
