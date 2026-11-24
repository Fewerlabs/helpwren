import { z } from "zod";

import {
  articleFilterSchema,
  audienceSchema,
  helpArticleSchema,
  type ArticleFilter,
} from "./article-filter";
import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/**
 * How a rule matches a page's address. `is`: exactly this path, such as `/settings/billing`.
 * `matches`: a pattern where `*` stands for anything, such as `/bookings/*`, which also takes
 * `/bookings` itself. `contains`: these characters anywhere in the address.
 *
 * `is` and `matches` look at the path when the value starts with `/`, and at the host and path
 * otherwise (`app.example.com/bookings/*`). `contains` looks at the host, path and query.
 */
export const helpRuleMatchSchema = z.enum(["is", "matches", "contains"]);
export type HelpRuleMatch = z.infer<typeof helpRuleMatchSchema>;

const ruleRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  url_match: helpRuleMatchSchema,
  url_value: z.string(),
  audience: z.string().nullable(),
  // A rule saved by an older version, or by hand, may hold parts this one does not know. They
  // are dropped, and a filter that cannot be read at all picks nothing rather than everything.
  filter: z.unknown().transform((value) => {
    const parsed = articleFilterSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }),
  enabled: z.boolean(),
  position: z.number().int(),
  updated_at: z.string(),
});

export const helpRuleSchema = ruleRowSchema.transform((row) => ({
  id: row.id,
  /** What the team calls it. Shown beside a conversation it matched. */
  name: row.name,
  urlMatch: row.url_match,
  /** The path, pattern or text to match, as `urlMatch` says. */
  urlValue: row.url_value,
  /** Only for visitors in this audience. `null`: everyone. */
  audience: row.audience,
  /** What to show. `null` when what is stored cannot be read; such a rule never matches. */
  filter: row.filter,
  enabled: row.enabled,
  /** Its place in the order, lowest first. The first enabled rule that matches wins. */
  position: row.position,
  updatedAt: row.updated_at,
}));

/** A rule that maps pages to the help articles shown on them. */
export type HelpRule = z.infer<typeof helpRuleSchema>;

export const helpRuleInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  urlMatch: helpRuleMatchSchema,
  urlValue: z.string().trim().min(1).max(500),
  /** Empty or `null` for everyone. */
  audience: z
    .union([z.literal("").transform(() => null), audienceSchema])
    .nullable()
    .default(null),
  filter: articleFilterSchema,
  enabled: z.boolean().default(true),
});
export type HelpRuleInput = z.input<typeof helpRuleInputSchema>;

export type SaveHelpRuleResult =
  { ok: true; rule: HelpRule } | { ok: false; reason: "forbidden" | "not_found" };
export type RemoveHelpRuleResult = { ok: true } | { ok: false; reason: "not_found" };

/** Where a page is, as the widget reports it. */
interface PageAddress {
  host: string;
  /** Without a final slash, for `is` and `matches`. */
  path: string;
  /** As it came, for `contains`. */
  rawPath: string;
  /** The query, with its `?`, or an empty string. */
  search: string;
}

function addressOf(url: string): PageAddress | null {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.host.toLowerCase(),
      path: trimSlash(parsed.pathname.toLowerCase()),
      rawPath: parsed.pathname.toLowerCase(),
      search: parsed.search.toLowerCase(),
    };
  } catch {
    return null;
  }
}

/** `/bookings/` and `/bookings` are one page. The root keeps its slash. */
function trimSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** A rule's value as it is matched: lower case, without a scheme, a query or a final slash. */
function cleanValue(value: string): string {
  return trimSlash(
    value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/[?#].*$/, ""),
  );
}

/** A path pattern as a regular expression: `*` is anything, and a final `/*` may be absent. */
function patternToRegExp(pattern: string): RegExp {
  const escape = (text: string) => text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const optionalTail = pattern.endsWith("/*");
  const body = optionalTail ? pattern.slice(0, -2) : pattern;
  const source = body.split("*").map(escape).join(".*");
  return new RegExp(`^${source}${optionalTail ? "(/.*)?" : ""}$`);
}

/** Whether a page's address matches a rule's `urlMatch` and `urlValue`. */
export function urlMatches(match: HelpRuleMatch, value: string, url: string): boolean {
  const page = addressOf(url);
  const wanted = cleanValue(value);
  if (!page || !wanted) return false;
  if (match === "contains") {
    return `${page.host}${page.rawPath}${page.search}`.includes(value.trim().toLowerCase());
  }
  const target = wanted.startsWith("/") ? page.path : `${page.host}${page.path}`;
  return match === "is" ? target === wanted : patternToRegExp(wanted).test(target);
}

/** The first enabled rule, in order, that matches the page and the visitor's audience. */
export function matchHelpRule(
  rules: readonly HelpRule[],
  page: { url: string; audience?: string | null | undefined },
): HelpRule | null {
  const audience = page.audience?.toLowerCase() ?? null;
  return (
    [...rules]
      .sort((first, second) => first.position - second.position)
      .find(
        (rule) =>
          rule.enabled &&
          rule.filter !== null &&
          (rule.audience === null || rule.audience.toLowerCase() === audience) &&
          urlMatches(rule.urlMatch, rule.urlValue, page.url),
      ) ?? null
  );
}

/** What decided the articles for a page: the page's own filter, or a rule. */
export type HelpMatch =
  | { kind: "filter"; filter: ArticleFilter }
  | { kind: "rule"; rule: HelpRule; filter: ArticleFilter };

/**
 * The filter for a page. A filter the page sends wins over every rule; otherwise the first rule
 * that matches. The page's audience, or else the visitor's, fills in a filter that does not
 * name one; a rule is matched on the visitor's alone. `null` when neither applies.
 */
export function pickHelpFilter(options: {
  filter?: ArticleFilter | undefined;
  rules: readonly HelpRule[];
  url?: string | undefined;
  audience?: string | null | undefined;
  pageAudience?: string | undefined;
}): HelpMatch | null {
  const audience = options.pageAudience ?? options.audience;
  const withAudience = (filter: ArticleFilter): ArticleFilter =>
    filter.audience || !audience ? filter : { ...filter, audience };
  if (options.filter) return { kind: "filter", filter: withAudience(options.filter) };
  if (!options.url) return null;
  const rule = matchHelpRule(options.rules, { url: options.url, audience: options.audience });
  return rule?.filter ? { kind: "rule", rule, filter: withAudience(rule.filter) } : null;
}

/** What `POST /api/articles/contextual` is sent: the page, and the filter it set, if any. */
export const pageHelpInputSchema = z.object({
  page: z
    .object({ url: z.url({ protocol: /^https?$/ }).max(2000), title: z.string().max(300) })
    .optional(),
  filter: articleFilterSchema.optional(),
  /** The audience the page says its help is for. */
  audience: audienceSchema.optional(),
});
export type PageHelpInput = z.input<typeof pageHelpInputSchema>;

/**
 * The help for a page. `match` is what applied: the page's filter, a rule (by id and name), or
 * nothing. `fallback` is the search used when that found no articles, or when nothing applied.
 */
export const pageHelpSchema = z.object({
  match: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("filter"), filter: articleFilterSchema }),
      z.object({ kind: z.literal("rule"), id: z.uuid(), name: z.string() }),
    ])
    .nullable(),
  fallback: z.string().nullable(),
  articles: z.array(helpArticleSchema),
});
export type PageHelp = z.infer<typeof pageHelpSchema>;

/**
 * What a conversation keeps about the help shown when it started, in `context.help`, for the
 * inbox. The rule is named by the server, from its id.
 */
export const conversationHelpSchema = z.object({
  match: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("filter"), filter: articleFilterSchema }),
      z.object({ kind: z.literal("rule"), id: z.uuid(), name: z.string().max(80).optional() }),
    ])
    .nullable(),
  fallback: z.string().max(300).nullable(),
});
export type ConversationHelp = z.infer<typeof conversationHelpSchema>;

const COLUMNS = "id, name, url_match, url_value, audience, filter, enabled, position, updated_at";

/** Postgres's error code for an action the access rules do not allow. */
const NOT_ALLOWED = "42501";

function toRow(input: z.output<typeof helpRuleInputSchema>) {
  return {
    name: input.name,
    url_match: input.urlMatch,
    url_value: input.urlValue,
    audience: input.audience,
    filter: input.filter,
    enabled: input.enabled,
  };
}

export function createHelpRules(supabase: HelpwrenSupabaseClient) {
  async function change(
    id: string,
    values: Partial<ReturnType<typeof toRow>>,
  ): Promise<SaveHelpRuleResult> {
    const { data, error } = await supabase
      .from("help_rules")
      .update(values)
      .eq("id", id)
      .select(COLUMNS);
    if (error) throw new HelpwrenError("Could not save the rule.", { cause: error });
    // The access rules hide what a caller may not change, so nothing comes back.
    const [row] = data;
    return row ? { ok: true, rule: helpRuleSchema.parse(row) } : { ok: false, reason: "not_found" };
  }

  return {
    /** Every rule, in order. For the team. */
    async list(): Promise<HelpRule[]> {
      const { data, error } = await supabase
        .from("help_rules")
        .select(COLUMNS)
        .order("position")
        .order("name");
      if (error) throw new HelpwrenError("Could not load the rules.", { cause: error });
      return z.array(helpRuleSchema).parse(data);
    },

    /** Adds a rule at the end of the list. For admins. */
    async create(input: HelpRuleInput): Promise<SaveHelpRuleResult> {
      const { data, error } = await supabase
        .from("help_rules")
        .insert(toRow(helpRuleInputSchema.parse(input)))
        .select(COLUMNS)
        .single();
      if (error) {
        if (error.code === NOT_ALLOWED) return { ok: false, reason: "forbidden" };
        throw new HelpwrenError("Could not save the rule.", { cause: error });
      }
      return { ok: true, rule: helpRuleSchema.parse(data) };
    },

    /** Replaces a rule's settings. For admins. */
    async update(id: string, input: HelpRuleInput): Promise<SaveHelpRuleResult> {
      return change(id, toRow(helpRuleInputSchema.parse(input)));
    },

    /** Switches a rule on or off without changing it otherwise. For admins. */
    async setEnabled(id: string, enabled: boolean): Promise<SaveHelpRuleResult> {
      return change(id, { enabled });
    },

    /** Removes a rule. For admins. */
    async remove(id: string): Promise<RemoveHelpRuleResult> {
      const { data, error } = await supabase.from("help_rules").delete().eq("id", id).select("id");
      if (error) throw new HelpwrenError("Could not remove the rule.", { cause: error });
      return data.length === 0 ? { ok: false, reason: "not_found" } : { ok: true };
    },

    /** Puts the rules in the order of the ids given. For admins. */
    async reorder(ids: readonly string[]): Promise<void> {
      const { error } = await supabase.rpc("reorder_help_rules", {
        ids: z.array(z.uuid()).parse(ids),
      });
      if (error) throw new HelpwrenError("Could not reorder the rules.", { cause: error });
    },
  };
}

export type HelpRulesApi = ReturnType<typeof createHelpRules>;
