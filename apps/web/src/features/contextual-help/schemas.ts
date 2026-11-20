import {
  ARTICLE_FILTER_LIMIT_MAX,
  articleFilterSortSchema,
  fieldKeySchema,
  helpRuleMatchSchema,
  localeSchema,
  type ArticleFilter,
  type HelpRule,
  type HelpRuleInput,
} from "@helpwren/core";
import { z } from "zod";

/** Stands for "the filter's own default order" in the list of choices, which cannot be empty. */
export const DEFAULT_SORT = "default";

const limitText = z
  .string()
  .trim()
  .refine(
    (text) => {
      if (text === "") return true;
      const limit = Number(text);
      return Number.isInteger(limit) && limit >= 1 && limit <= ARTICLE_FILTER_LIMIT_MAX;
    },
    `A number from 1 to ${String(ARTICLE_FILTER_LIMIT_MAX)}.`,
  );

/** The rule editor's form: when the rule applies, then the filter's parts as plain controls. */
export const ruleFormSchema = z.object({
  name: z.string().trim().min(1, "Give the rule a name.").max(80),
  urlMatch: helpRuleMatchSchema,
  urlValue: z.string().trim().min(1, "Say which pages it is for.").max(500),
  audience: z.string().trim().toLowerCase().max(60),
  collections: z.array(z.string()),
  tagsAny: z.array(z.string()),
  tagsAll: z.array(z.string()),
  tagsNone: z.array(z.string()),
  q: z.string().trim().max(200),
  locale: z
    .string()
    .trim()
    .refine(
      (text) => text === "" || localeSchema.safeParse(text).success,
      "Use a language code, such as en or pt-br.",
    ),
  fields: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .refine(
      (rows) =>
        rows.every(
          (row) =>
            (row.key.trim() === "" && row.value.trim() === "") ||
            (fieldKeySchema.safeParse(row.key.trim()).success && row.value.trim() !== ""),
        ),
      "Give each field a name of lower case letters, digits and underscores, and a value.",
    ),
  articles: z.array(z.string()),
  sort: z.union([z.literal(DEFAULT_SORT), articleFilterSortSchema]),
  limit: limitText,
  enabled: z.boolean(),
});

export type RuleFormValues = z.infer<typeof ruleFormSchema>;

/** The form for a new rule. */
export const emptyRule: RuleFormValues = {
  name: "",
  urlMatch: "matches",
  urlValue: "",
  audience: "",
  collections: [],
  tagsAny: [],
  tagsAll: [],
  tagsNone: [],
  q: "",
  locale: "",
  fields: [],
  articles: [],
  sort: DEFAULT_SORT,
  limit: "",
  enabled: true,
};

/** A saved rule, as the form shows it. */
export function ruleToForm(rule: HelpRule): RuleFormValues {
  const filter: ArticleFilter = rule.filter ?? {};
  return {
    name: rule.name,
    urlMatch: rule.urlMatch,
    urlValue: rule.urlValue,
    audience: rule.audience ?? "",
    collections: filter.collection ? [filter.collection].flat() : [],
    tagsAny: filter.tags?.any ?? [],
    tagsAll: filter.tags?.all ?? [],
    tagsNone: filter.tags?.none ?? [],
    q: filter.q ?? "",
    locale: filter.locale ?? "",
    fields: Object.entries(filter.fields ?? {}).map(([key, value]) => ({ key, value })),
    articles: filter.articles ?? [],
    sort: filter.sort ?? DEFAULT_SORT,
    limit: filter.limit === undefined ? "" : String(filter.limit),
    enabled: rule.enabled,
  };
}

/** What the form says, as a rule to save. Parts left empty are left out of the filter. */
export function formToRule(values: RuleFormValues): HelpRuleInput {
  const tags = {
    ...(values.tagsAny.length > 0 ? { any: values.tagsAny } : {}),
    ...(values.tagsAll.length > 0 ? { all: values.tagsAll } : {}),
    ...(values.tagsNone.length > 0 ? { none: values.tagsNone } : {}),
  };
  const fields = Object.fromEntries(
    values.fields
      .filter((row) => row.key.trim() !== "")
      .map((row) => [row.key.trim(), row.value.trim()]),
  );
  const filter: ArticleFilter = {
    ...(values.collections.length === 1 ? { collection: values.collections[0] } : {}),
    ...(values.collections.length > 1 ? { collection: values.collections } : {}),
    ...(Object.keys(tags).length > 0 ? { tags } : {}),
    ...(values.q ? { q: values.q } : {}),
    ...(values.locale ? { locale: values.locale.toLowerCase() } : {}),
    ...(Object.keys(fields).length > 0 ? { fields } : {}),
    ...(values.articles.length > 0 ? { articles: values.articles } : {}),
    ...(values.sort === DEFAULT_SORT ? {} : { sort: values.sort }),
    ...(values.limit ? { limit: Number(values.limit) } : {}),
  };
  return {
    name: values.name,
    urlMatch: values.urlMatch,
    urlValue: values.urlValue,
    audience: values.audience || null,
    filter,
    enabled: values.enabled,
  };
}

/** A page to try the rules on, in the test box. */
export const testPageSchema = z.object({
  url: z.url({ protocol: /^https?$/, error: "Enter a whole address, starting with https://." }),
  title: z.string().trim().max(300),
  audience: z.string().trim().toLowerCase().max(60),
});

export type TestPageValues = z.infer<typeof testPageSchema>;
