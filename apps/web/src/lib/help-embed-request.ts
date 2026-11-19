import "server-only";

import { headers } from "next/headers";

import { EMBED_HEADER, parseHelpEmbed, type HelpEmbed } from "./help-embed";

/**
 * Whether this request is for the help center's embedded form, and with which options. The
 * proxy checks the address and writes what it accepted into a header, so the layout and the
 * page, which cannot both read the address, agree on one answer.
 */
export async function getHelpEmbed(): Promise<HelpEmbed | null> {
  const accepted = (await headers()).get(EMBED_HEADER);
  return accepted === null ? null : parseHelpEmbed(new URLSearchParams(accepted));
}
