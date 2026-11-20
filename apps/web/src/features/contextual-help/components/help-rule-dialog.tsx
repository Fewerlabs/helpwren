"use client";

import {
  articleFilterSchema,
  describeArticleFilter,
  type HelpRule,
  type HelpRuleMatch,
} from "@helpwren/core";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldList,
  KeyValueInput,
  toast,
  type ComboboxOption,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";

import { useHelpwren } from "@/lib/helpwren-context";

import { HELP_RULES_QUERY_KEY, useHelpRulesChanged } from "../hooks/use-help-rules";
import {
  DEFAULT_SORT,
  emptyRule,
  formToRule,
  ruleFormSchema,
  ruleToForm,
  type RuleFormValues,
} from "../schemas";

const failures = {
  forbidden: "Only admins can change the rules.",
  not_found: "This rule no longer exists, or you cannot change it.",
  failed: "The rule could not be saved. Try again.",
} as const;

/** How each way of matching a page reads, and what its box expects. */
export const matchLabels: Record<HelpRuleMatch, string> = {
  is: "URL is",
  matches: "URL matches",
  contains: "URL contains",
};

const matchPlaceholders: Record<HelpRuleMatch, string> = {
  is: "/settings/billing",
  matches: "/bookings/*",
  contains: "checkout",
};

const matchHints: Record<HelpRuleMatch, string> = {
  is: "One page's path. Start with the host, as in app.example.com/billing, to name one site.",
  matches: "A path where * stands for anything. /bookings/* takes /bookings too.",
  contains: "These characters anywhere in the address, its query included.",
};

const lowerCase = (text: string) => text.trim().toLowerCase();

export interface HelpRuleDialogProps {
  /** The rule being changed, or `null` to add one. */
  rule: HelpRule | null;
  onClose: () => void;
}

/**
 * The editor for one rule: which pages it is for, and which articles they show. Every part of
 * what to show is optional and the parts combine; the line at the bottom says what it adds up to.
 */
export function HelpRuleDialog({ rule, onClose }: HelpRuleDialogProps) {
  const getClient = useHelpwren();
  const changed = useHelpRulesChanged();
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: rule ? ruleToForm(rule) : emptyRule,
  });
  const values = useWatch({ control: form.control }) as RuleFormValues;
  const urlMatch = values.urlMatch;

  const collections =
    useQuery({
      queryKey: [...HELP_RULES_QUERY_KEY, "collections"],
      queryFn: () => getClient().collections.list(),
    }).data ?? [];
  const tags =
    useQuery({
      queryKey: [...HELP_RULES_QUERY_KEY, "tags"],
      queryFn: () => getClient().articles.tags(),
    }).data ?? [];

  const tagField = (
    name: "tagsAny" | "tagsAll" | "tagsNone",
    label: string,
  ): FieldItem<RuleFormValues> => ({
    name,
    label,
    type: "tags",
    props: { transform: lowerCase, suggestions: tags },
  });

  const fields: FieldItem<RuleFormValues>[] = [
    {
      name: "name",
      label: "Name",
      type: "input",
      required: true,
      hint: "Shown beside a conversation that started on a page it matched.",
      props: { autoComplete: "off", placeholder: "Bookings pages" },
    },
    {
      name: "urlMatch",
      label: "When the page",
      type: "select",
      props: {
        options: (Object.keys(matchLabels) as HelpRuleMatch[]).map((value) => ({
          value,
          label: matchLabels[value],
        })),
      },
    },
    {
      name: "urlValue",
      label: matchLabels[urlMatch],
      type: "input",
      required: true,
      hint: matchHints[urlMatch],
      props: {
        autoComplete: "off",
        autoCapitalize: "none",
        spellCheck: false,
        className: "font-mono",
        placeholder: matchPlaceholders[urlMatch],
      },
    },
    {
      name: "audience",
      label: "And the visitor's audience is",
      type: "input",
      hint: "As Settings > Identity names it, such as business. Empty: anyone.",
      props: { autoComplete: "off", autoCapitalize: "none", placeholder: "Anyone" },
    },
  ];

  const showFields: FieldItem<RuleFormValues>[] = [
    {
      name: "collections",
      label: "Collections",
      type: "combobox",
      props: {
        multiple: true,
        options: collections.map((item): ComboboxOption => ({
          value: item.slug,
          label: item.name,
        })),
        placeholder: "Any collection",
      },
    },
    tagField("tagsAny", "Tags, any of"),
    tagField("tagsAll", "Tags, all of"),
    tagField("tagsNone", "Tags, none of"),
    {
      name: "q",
      label: "Search for",
      type: "input",
      hint: "Words the articles must hold.",
      props: { autoComplete: "off", placeholder: "payment failed" },
    },
    {
      name: "articles",
      label: "Put these articles first",
      type: "combobox",
      className: "sm:col-span-2",
      props: {
        multiple: true,
        placeholder: "Search published articles",
        loadOptions: async ({ search }) => {
          const page = await getClient().articles.list({
            status: "published",
            search,
            pageSize: 20,
          });
          return {
            options: page.items.map((article) => ({ value: article.slug, label: article.title })),
          };
        },
        resolveOptions: async (slugs) => {
          const found = await getClient().articles.find({
            articles: [...slugs],
            limit: Math.min(slugs.length, 50),
          });
          return found.map((article) => ({ value: article.slug, label: article.title }));
        },
      },
    },
    {
      name: "fields",
      label: "Custom fields",
      type: "custom",
      className: "sm:col-span-2",
      hint: "Articles whose custom fields hold every pair given.",
      render: ({ field, fieldState }) => (
        <KeyValueInput
          value={field.value}
          onValueChange={field.onChange}
          keyPlaceholder="plan"
          valuePlaceholder="pro"
          transformKey={(key) => key.toLowerCase().replace(/[^a-z0-9_]/g, "_")}
          max={20}
          invalidRows={fieldState.error ? field.value.map((_, index) => index) : []}
        />
      ),
    },
    {
      name: "locale",
      label: "Language",
      type: "input",
      hint: "Articles in this language, or in none in particular.",
      props: { autoComplete: "off", autoCapitalize: "none", placeholder: "Any" },
    },
    {
      name: "sort",
      label: "Order",
      type: "select",
      props: {
        options: [
          { value: DEFAULT_SORT, label: "Best match, or the collection's order" },
          { value: "position", label: "The collection's order" },
          { value: "relevance", label: "Best match first" },
          { value: "updated", label: "Latest change first" },
          { value: "popular", label: "Most found helpful first" },
        ],
      },
    },
    {
      name: "limit",
      label: "How many",
      type: "input",
      hint: "Up to 50. Empty: 5.",
      props: { inputMode: "numeric", autoComplete: "off", placeholder: "5" },
    },
    {
      name: "enabled",
      label: "On",
      type: "switch",
      hint: "A rule that is off is skipped.",
    },
  ];

  // What the rule adds up to, as the table will say it, from what is typed so far.
  const preview = articleFilterSchema.safeParse(formToRule({ ...emptyRule, ...values }).filter);

  async function save(next: RuleFormValues) {
    const input = formToRule(next);
    const rules = getClient().helpRules;
    const result = await (rule ? rules.update(rule.id, input) : rules.create(input)).catch(() => ({
      ok: false as const,
      reason: "failed" as const,
    }));
    if (!result.ok) {
      form.setError("root", { message: failures[result.reason] });
      return;
    }
    await changed();
    toast.success(rule ? "Rule updated" : "Rule added");
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit rule" : "New rule"}</DialogTitle>
          <DialogDescription>
            Pages that match show these articles under &ldquo;Help for this page&rdquo; in the chat.
            Rules are tried in order, and the first that matches wins.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-6"
          onSubmit={(event) => {
            void form.handleSubmit(save)(event);
          }}
        >
          <section aria-labelledby="rule-when" className="grid gap-3">
            <h3
              id="rule-when"
              className="text-muted-foreground text-2xs font-mono tracking-wider uppercase"
            >
              When
            </h3>
            <FieldList
              control={form.control}
              fields={fields}
              columns={2}
              disabled={form.formState.isSubmitting}
            />
          </section>
          <section aria-labelledby="rule-show" className="grid gap-3">
            <h3
              id="rule-show"
              className="text-muted-foreground text-2xs font-mono tracking-wider uppercase"
            >
              Show
            </h3>
            <FieldList
              control={form.control}
              fields={showFields}
              columns={2}
              disabled={form.formState.isSubmitting}
            />
            <p className="bg-muted rounded-lg px-3 py-2 text-xs" aria-live="polite">
              <span className="text-muted-foreground">Shows: </span>
              {preview.success
                ? describeArticleFilter(preview.data).join(" · ")
                : "Finish the parts marked above."}
            </p>
          </section>
          {form.formState.errors.root ? (
            <p role="alert" className="text-destructive text-sm">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {rule ? "Save changes" : "Add rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
