import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";
import { visitorDeviceSchema } from "./visitors";

export const contactKindSchema = z.enum(["guest", "user"]);
export type ContactKind = z.infer<typeof contactKindSchema>;

const contactSummaryRowSchema = z.object({
  id: z.uuid(),
  kind: contactKindSchema,
  verified: z.boolean(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  org_name: z.string().nullable(),
  created_at: z.string(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  browser: z.string().nullable(),
  os: z.string().nullable(),
  device: visitorDeviceSchema.nullable(),
  language: z.string().nullable(),
  timezone: z.string().nullable(),
  first_seen_at: z.string().nullable(),
  last_seen_at: z.string().nullable(),
  session_count: z.number().int().nullable(),
  last_page_url: z.string().nullable(),
  last_page_title: z.string().nullable(),
  referrer: z.string().nullable(),
  conversation_count: z.number().int(),
  last_active_at: z.string().nullable(),
});

export const contactSummarySchema = contactSummaryRowSchema.transform((row) => ({
  id: row.id,
  kind: row.kind,
  verified: row.verified,
  name: row.name,
  email: row.email,
  phone: row.phone,
  /** The organisation a verified user belongs to, if the host product reported one. */
  organisation: row.org_name,
  firstSeenAt: row.created_at,
  conversationCount: row.conversation_count,
  /** When they last wrote or were written to. */
  lastActiveAt: row.last_active_at,
  /**
   * What the browser they used last said about them, as the chat checks in. `null` when theirs
   * never has, as for someone who wrote before this existed or with visitor tracking off.
   */
  visitor:
    row.last_seen_at === null
      ? null
      : {
          location: { country: row.country, region: row.region, city: row.city },
          browser: row.browser,
          os: row.os,
          device: row.device,
          language: row.language,
          timezone: row.timezone,
          firstSeenAt: row.first_seen_at,
          lastSeenAt: row.last_seen_at,
          sessionCount: row.session_count,
          lastPage: row.last_page_url
            ? { url: row.last_page_url, title: row.last_page_title }
            : null,
          referrer: row.referrer,
        },
}));

/** A contact with how many conversations they have and when they were last active. */
export type ContactSummary = z.infer<typeof contactSummarySchema>;

export interface ListContactsOptions {
  /** Text to find in a name, email address or phone number. */
  search?: string | undefined;
  /** Only guests, or only users. Default: both. */
  kind?: ContactKind | undefined;
  /** Only contacts in these countries, as ISO codes such as `NG`. */
  countries?: readonly string[] | undefined;
  /** Only contacts last seen on these kinds of device. */
  devices?: readonly ContactDevice[] | undefined;
  /** Only verified contacts, or only unverified ones. */
  verified?: boolean | undefined;
  /** Only contacts last seen within any of these spans, or never seen browsing. */
  seen?: readonly ContactSeen[] | undefined;
  /** Only contacts who have written, or only those who have not. */
  conversations?: "some" | "none" | undefined;
  /** Which page, starting at 1. */
  page?: number | undefined;
  /** How many to a page. Default 25. */
  pageSize?: number | undefined;
}

/** The kinds of device a contact can be seen on. */
export const CONTACT_DEVICES = ["desktop", "mobile", "tablet"] as const;
export type ContactDevice = (typeof CONTACT_DEVICES)[number];

/** How recently a contact was seen browsing, for filtering: within a span, or never. */
export const CONTACT_SEEN = ["day", "week", "month", "never"] as const;
export type ContactSeen = (typeof CONTACT_SEEN)[number];

const SEEN_DAYS: Record<Exclude<ContactSeen, "never">, number> = { day: 1, week: 7, month: 30 };

export interface ContactsPage {
  items: ContactSummary[];
  /** How many contacts match, across every page. */
  total: number;
}

const COLUMNS =
  "id, kind, verified, name, email, phone, org_name, created_at, " +
  "country, region, city, browser, os, device, language, timezone, first_seen_at, last_seen_at, " +
  "session_count, last_page_url, last_page_title, referrer, conversation_count, last_active_at";

/** Characters that have a meaning in a filter and so cannot be searched for as themselves. */
const FILTER_SYNTAX = /[,()%*\\"]/g;

/** Whether a contact may still write, as the team sees it on their page. */
export interface BlockStatus {
  /** When the contact was blocked, or `null` if they are not. */
  blockedAt: string | null;
  /** Whether the network they last started a conversation from is blocked too. */
  networkBlocked: boolean;
  /** Whether that network is known, and so could be blocked. */
  networkKnown: boolean;
}

export type BlockResult = { ok: true } | { ok: false; reason: "forbidden" };

/** Postgres's error code for an action the access rules do not allow. */
const NOT_ALLOWED = "42501";

export function createContacts(supabase: HelpwrenSupabaseClient) {
  return {
    /**
     * Everyone who has written, most recently active first. For team members; a contact who
     * calls this gets only themselves.
     */
    async list(options: ListContactsOptions = {}): Promise<ContactsPage> {
      const pageSize = options.pageSize ?? 25;
      const from = ((options.page ?? 1) - 1) * pageSize;

      let query = supabase
        .from("contact_summaries")
        .select(COLUMNS, { count: "exact" })
        .order("last_active_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (options.kind) query = query.eq("kind", options.kind);
      if (options.countries?.length) query = query.in("country", [...options.countries]);
      if (options.devices?.length) query = query.in("device", [...options.devices]);
      if (options.verified !== undefined) query = query.eq("verified", options.verified);
      if (options.conversations === "some") query = query.gt("conversation_count", 0);
      if (options.conversations === "none") query = query.eq("conversation_count", 0);
      if (options.seen?.length) {
        // Any of the chosen spans will do, so they are joined as alternatives.
        const spans = options.seen.map((span) =>
          span === "never"
            ? "last_seen_at.is.null"
            : `last_seen_at.gte.${new Date(Date.now() - SEEN_DAYS[span] * 86_400_000).toISOString()}`,
        );
        query = query.or(spans.join(","));
      }

      const term = options.search?.replace(FILTER_SYNTAX, " ").trim();
      if (term) {
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const { data, count, error } = await query;
      if (error) throw new HelpwrenError("Could not load the contacts.", { cause: error });
      return { items: z.array(contactSummarySchema).parse(data), total: count ?? data.length };
    },

    /** The countries contacts have been seen in, as ISO codes, for a filter's choices. */
    async countries(): Promise<string[]> {
      const { data, error } = await supabase
        .from("contact_summaries")
        .select("country")
        .not("country", "is", null)
        .limit(5000);
      if (error) throw new HelpwrenError("Could not load the countries.", { cause: error });
      const codes = z.array(z.object({ country: z.string() })).parse(data);
      return [...new Set(codes.map((row) => row.country))].sort();
    },

    /** One contact, or `null` if there is none or it is not the caller's to read. */
    async get(id: string): Promise<ContactSummary | null> {
      const { data, error } = await supabase
        .from("contact_summaries")
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new HelpwrenError("Could not load the contact.", { cause: error });
      return data ? contactSummarySchema.parse(data) : null;
    },

    /** Whether a contact is blocked. For the team. */
    async blockStatus(id: string): Promise<BlockStatus> {
      const { data, error } = await supabase
        .from("contacts")
        .select("blocked_at, network_key")
        .eq("id", z.uuid().parse(id))
        .maybeSingle();
      if (error) throw new HelpwrenError("Could not load the contact.", { cause: error });
      if (!data?.network_key) {
        return { blockedAt: data?.blocked_at ?? null, networkBlocked: false, networkKnown: false };
      }
      const network = await supabase
        .from("blocked_networks")
        .select("key", { count: "exact", head: true })
        .eq("key", data.network_key);
      if (network.error) {
        throw new HelpwrenError("Could not load the contact.", { cause: network.error });
      }
      return {
        blockedAt: data.blocked_at,
        networkBlocked: (network.count ?? 0) > 0,
        networkKnown: true,
      };
    },

    /**
     * Blocks a contact: they can no longer write, start a conversation or send a file. With
     * `network`, the network they last started a conversation from is blocked too, which stops
     * them starting again as a new guest, and also anyone else who shares it. For the team.
     * Each block is recorded in the audit log.
     */
    async block(id: string, options: { network?: boolean } = {}): Promise<BlockResult> {
      const contactId = z.uuid().parse(id);
      const { data, error } = await supabase
        .from("contacts")
        // The database sets the time and who did it; this only has to say "now".
        .update({ blocked_at: new Date().toISOString() })
        .eq("id", contactId)
        .select("network_key");
      if (error) {
        if (error.code === NOT_ALLOWED) return { ok: false, reason: "forbidden" };
        throw new HelpwrenError("Could not block the contact.", { cause: error });
      }
      if (data.length === 0) return { ok: false, reason: "forbidden" };

      const key = data[0]?.network_key;
      if (options.network && key) {
        const network = await supabase
          .from("blocked_networks")
          .upsert({ key, contact_id: contactId }, { onConflict: "key", ignoreDuplicates: true });
        if (network.error) {
          throw new HelpwrenError("Could not block the network.", { cause: network.error });
        }
      }
      return { ok: true };
    },

    /** Lets a blocked contact write again, and lifts the block on their network. For the team. */
    async unblock(id: string): Promise<BlockResult> {
      const contactId = z.uuid().parse(id);
      const { data, error } = await supabase
        .from("contacts")
        .update({ blocked_at: null })
        .eq("id", contactId)
        .select("network_key");
      if (error) {
        if (error.code === NOT_ALLOWED) return { ok: false, reason: "forbidden" };
        throw new HelpwrenError("Could not unblock the contact.", { cause: error });
      }
      if (data.length === 0) return { ok: false, reason: "forbidden" };

      const key = data[0]?.network_key;
      if (key) {
        const network = await supabase.from("blocked_networks").delete().eq("key", key);
        if (network.error) {
          throw new HelpwrenError("Could not unblock the network.", { cause: network.error });
        }
      }
      return { ok: true };
    },

    /** How many guests and how many users there are. */
    async countByKind(): Promise<Record<ContactKind, number>> {
      const counts = await Promise.all(
        contactKindSchema.options.map(async (kind) => {
          const { count, error } = await supabase
            .from("contacts")
            .select("id", { count: "exact", head: true })
            .eq("kind", kind);
          if (error) throw new HelpwrenError("Could not count the contacts.", { cause: error });
          return [kind, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(counts) as Record<ContactKind, number>;
    },
  };
}

export type ContactsApi = ReturnType<typeof createContacts>;
