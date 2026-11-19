import { z } from "zod";

import { type Api } from "./api";
import { messageBodySchema } from "./conversations";
import { HelpwrenError } from "./errors";
import { visitorIdSchema } from "./identity";
import { type HelpwrenSupabaseClient } from "./supabase";

/** The kind of device a browser runs on, as its User-Agent says. */
export const visitorDeviceSchema = z.enum(["desktop", "mobile", "tablet"]);
export type VisitorDevice = z.infer<typeof visitorDeviceSchema>;

/** A page on the web. Shown to the team as a link, so nothing but http and https. */
const webAddressSchema = z.url({ protocol: /^https?$/ }).max(2000);

/** A page and its title. A page with no title has none, rather than an empty one. */
const pageSchema = z.object({
  url: webAddressSchema,
  title: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((title) => (title === "" ? undefined : title)),
});

/** What the chat sends when it checks in. Browser and location are worked out by the server. */
export const visitorCheckInInputSchema = z.object({
  visitorId: visitorIdSchema,
  page: pageSchema,
  /** The address the visitor came to the page from, if the browser says. */
  referrer: webAddressSchema.optional(),
  /** The browser's language, such as `en-GB`. */
  language: z.string().trim().min(2).max(35).optional(),
  /** The browser's time zone, such as `Europe/London`. */
  timezone: z.string().trim().min(1).max(64).optional(),
});
export type VisitorCheckInInput = z.input<typeof visitorCheckInInputSchema>;

export const visitorCheckInResultSchema = z.object({
  /** True when the team has written to this browser and the message is waiting to be taken up. */
  outreach: z.boolean(),
});

/** Taking up a message the team left for this browser. */
export const claimOutreachInputSchema = z.object({
  visitorId: visitorIdSchema,
  source: z.string().trim().min(1).max(40).default("web"),
  /** The page the chat is on, kept with the conversation as when a visitor starts one. */
  page: pageSchema.optional(),
});
export type ClaimOutreachInput = z.input<typeof claimOutreachInputSchema>;

/** `null` when nothing was waiting, as when another tab took it up first. */
export const claimOutreachResultSchema = z.object({ conversationId: z.uuid().nullable() });

/** A team member's first message to a visitor. */
export const outreachInputSchema = z.object({ message: messageBodySchema });

const recentPageSchema = z.object({
  url: z.string(),
  title: z.string().nullable().optional(),
  at: z.string(),
});

const visitorRowSchema = z.object({
  id: z.string(),
  contact_id: z.uuid().nullable(),
  page_url: z.string(),
  page_title: z.string().nullable(),
  referrer: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  device: visitorDeviceSchema.nullable(),
  language: z.string().nullable(),
  timezone: z.string().nullable(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  first_seen_at: z.string(),
  session_started_at: z.string(),
  last_seen_at: z.string(),
  session_count: z.number().int(),
  // Written only by the database, but read leniently: a bad entry is dropped, not fatal.
  recent_pages: z.array(z.unknown()),
  pending_message: z.string().nullable(),
  pending_at: z.string().nullable(),
  outreach_conversation_id: z.uuid().nullable(),
  pending_agent: z.object({ name: z.string() }).nullable(),
  contact: z
    .object({
      name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      conversation_count: z.number().int(),
    })
    .nullable(),
});

export const visitorSchema = visitorRowSchema.transform((row) => ({
  id: row.id,
  /** Who this is, once they have written or taken up a message from the team. */
  contact: row.contact_id
    ? {
        id: row.contact_id,
        name: row.contact?.name ?? null,
        email: row.contact?.email ?? null,
        phone: row.contact?.phone ?? null,
        conversationCount: row.contact?.conversation_count ?? 0,
      }
    : null,
  page: { url: row.page_url, title: row.page_title },
  referrer: row.referrer,
  browser: row.browser,
  os: row.os,
  device: row.device,
  language: row.language,
  timezone: row.timezone,
  /** From the hosting platform, when it says. `country` is a two-letter code such as `GB`. */
  location: { country: row.country, region: row.region, city: row.city },
  firstSeenAt: row.first_seen_at,
  /** When this visit began: the first check-in after half an hour or more away. */
  sessionStartedAt: row.session_started_at,
  lastSeenAt: row.last_seen_at,
  sessionCount: row.session_count,
  /** Newest first, at most ten. */
  recentPages: row.recent_pages.flatMap((entry) => {
    const page = recentPageSchema.safeParse(entry);
    return page.success ? [{ ...page.data, title: page.data.title ?? null }] : [];
  }),
  /**
   * A message from the team: still waiting for the visitor's browser to take it up, or taken
   * up and now a conversation. `null` when nobody has written to them from here.
   */
  outreach:
    row.pending_message !== null
      ? {
          status: "waiting" as const,
          message: row.pending_message,
          from: row.pending_agent?.name ?? null,
          at: row.pending_at,
        }
      : row.outreach_conversation_id !== null
        ? { status: "started" as const, conversationId: row.outreach_conversation_id }
        : null,
}));

/** One browser on the site: where it is, what it is looking at, and who it is if known. */
export type Visitor = z.infer<typeof visitorSchema>;

export interface ListVisitorsOptions {
  /** Only browsers that checked in within this many seconds. Default 120. */
  activeWithinSeconds?: number | undefined;
}

export type CheckInResult =
  { ok: true; outreach: boolean } | { ok: false; reason: "off" | "rate_limited" };

export type StartOutreachResult =
  { ok: true } | { ok: false; reason: "forbidden" | "off" | "not_found" };

const COLUMNS =
  "id, contact_id, page_url, page_title, referrer, browser, os, device, language, timezone, " +
  "country, region, city, first_seen_at, session_started_at, last_seen_at, session_count, " +
  "recent_pages, pending_message, pending_at, outreach_conversation_id, " +
  "pending_agent:agents(name), " +
  "contact:contact_summaries(name, email, phone, conversation_count)";

/** The most browsers the live list shows at once. */
const LIST_LIMIT = 200;

function failed(what: string, cause: unknown): HelpwrenError {
  return new HelpwrenError(`Could not ${what}.`, { cause });
}

export function createVisitors(supabase: HelpwrenSupabaseClient, api: Api) {
  return {
    /** Who is on the site now, the newest arrivals first. For team members. */
    async list(options: ListVisitorsOptions = {}): Promise<Visitor[]> {
      const since = new Date(Date.now() - (options.activeWithinSeconds ?? 120) * 1000);
      const { data, error } = await supabase
        .from("visitors")
        .select(COLUMNS)
        .gte("last_seen_at", since.toISOString())
        .order("session_started_at", { ascending: false })
        .limit(LIST_LIMIT);
      if (error) throw failed("load the visitors", error);
      return z.array(visitorSchema).parse(data);
    },

    /** One browser, or `null` if there is none or it is not the caller's to read. */
    async get(id: string): Promise<Visitor | null> {
      const { data, error } = await supabase
        .from("visitors")
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw failed("load the visitor", error);
      return data ? visitorSchema.parse(data) : null;
    },

    /** The browser a contact was seen on last, or `null` if theirs never checked in. */
    async latestForContact(contactId: string): Promise<Visitor | null> {
      const { data, error } = await supabase
        .from("visitors")
        .select(COLUMNS)
        .eq("contact_id", contactId)
        .order("last_seen_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw failed("load the visitor", error);
      return data ? visitorSchema.parse(data) : null;
    },

    /**
     * Tells the install this browser is on a page. The chat calls it about once a minute while
     * the page is showing. The answer says whether the team has written to it.
     */
    async checkIn(input: VisitorCheckInInput): Promise<CheckInResult> {
      const result = await api.post(
        "/api/visitors",
        visitorCheckInInputSchema.parse(input),
        visitorCheckInResultSchema,
      );
      if (result.ok) return { ok: true, outreach: result.data.outreach };
      if (result.code === "disabled") return { ok: false, reason: "off" };
      if (result.code === "rate_limited") return { ok: false, reason: "rate_limited" };
      throw new HelpwrenError(`Could not check in: ${result.message}`);
    },

    /**
     * Takes up the message the team left for this browser, which becomes a conversation of the
     * session on this device. Start one with `sessions.startGuest()` first. Returns the new
     * conversation's id, or `null` if nothing was waiting.
     */
    async claimOutreach(input: ClaimOutreachInput): Promise<string | null> {
      const result = await api.post(
        "/api/visitors/outreach",
        claimOutreachInputSchema.parse(input),
        claimOutreachResultSchema,
      );
      if (result.ok) return result.data.conversationId;
      if (result.code === "disabled") return null;
      throw new HelpwrenError(`Could not take up the team's message: ${result.message}`);
    },

    /**
     * Leaves a first message for a visitor, which their browser takes up the next time it
     * checks in. A message already waiting is replaced. For team members.
     */
    async startConversation(visitorId: string, message: string): Promise<StartOutreachResult> {
      const result = await api.post(
        `/api/visitors/${encodeURIComponent(visitorId)}/outreach`,
        outreachInputSchema.parse({ message }),
        z.object({ ok: z.literal(true) }),
      );
      return outreachResult(result);
    },

    /** Takes back a message that has not been taken up yet. For team members. */
    async cancelOutreach(visitorId: string): Promise<StartOutreachResult> {
      const result = await api.delete(
        `/api/visitors/${encodeURIComponent(visitorId)}/outreach`,
        z.object({ ok: z.literal(true) }),
      );
      return outreachResult(result);
    },
  };
}

function outreachResult(result: Awaited<ReturnType<Api["post"]>>): StartOutreachResult {
  if (result.ok) return { ok: true };
  if (result.code === "forbidden" || result.code === "unauthorized") {
    return { ok: false, reason: "forbidden" };
  }
  if (result.code === "disabled") return { ok: false, reason: "off" };
  if (result.code === "not_found") return { ok: false, reason: "not_found" };
  throw new HelpwrenError(`Could not change the message: ${result.message}`);
}

export type VisitorsApi = ReturnType<typeof createVisitors>;
