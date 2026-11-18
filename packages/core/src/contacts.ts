import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

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
}));

/** A contact with how many conversations they have and when they were last active. */
export type ContactSummary = z.infer<typeof contactSummarySchema>;

export interface ListContactsOptions {
  /** Text to find in a name, email address or phone number. */
  search?: string | undefined;
  /** Only guests, or only users. Default: both. */
  kind?: ContactKind | undefined;
  /** Which page, starting at 1. */
  page?: number | undefined;
  /** How many to a page. Default 25. */
  pageSize?: number | undefined;
}

export interface ContactsPage {
  items: ContactSummary[];
  /** How many contacts match, across every page. */
  total: number;
}

const COLUMNS =
  "id, kind, verified, name, email, phone, org_name, created_at, conversation_count, last_active_at";

/** Characters that have a meaning in a filter and so cannot be searched for as themselves. */
const FILTER_SYNTAX = /[,()%*\\"]/g;

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

      const term = options.search?.replace(FILTER_SYNTAX, " ").trim();
      if (term) {
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const { data, count, error } = await query;
      if (error) throw new HelpwrenError("Could not load the contacts.", { cause: error });
      return { items: z.array(contactSummarySchema).parse(data), total: count ?? data.length };
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
