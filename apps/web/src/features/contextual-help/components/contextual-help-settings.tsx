"use client";

import { describeArticleFilter, type HelpRule, type PageHelp } from "@helpwren/core";
import {
  ActionButton,
  Badge,
  Button,
  EmptyState,
  FieldList,
  Icon,
  Link,
  QueryTable,
  Switch,
  toast,
  useConfirm,
  type DataTableColumn,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";

import { SettingsSection } from "@/features/settings";
import { useHelpwren } from "@/lib/helpwren-context";

import { saveFallback, testPage } from "../actions";
import { HELP_RULES_QUERY_KEY, useHelpRulesChanged } from "../hooks/use-help-rules";
import { testPageSchema, type TestPageValues } from "../schemas";
import { HelpRuleDialog, matchLabels } from "./help-rule-dialog";

export interface ContextualHelpSettingsProps {
  /** Admins change the rules; agents read them and try pages. */
  canEdit: boolean;
  /** Whether a page nothing else finds help for searches for its title. */
  fallback: boolean;
}

/** What a rule matches, in a line: `URL matches /bookings/*`. */
function RuleWhen({ rule }: { rule: HelpRule }) {
  return (
    <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      <span>{matchLabels[rule.urlMatch]}</span>
      <code className="text-foreground truncate font-mono">{rule.urlValue}</code>
      {rule.audience ? <Badge variant="outline">{rule.audience}</Badge> : null}
    </span>
  );
}

function ruleShows(rule: HelpRule): string {
  return rule.filter
    ? describeArticleFilter(rule.filter).join(" · ")
    : "A filter this version cannot read";
}

/**
 * Settings > Contextual help: the rules that map pages to help articles, in the order they are
 * tried, a box to try a page against them, and what happens when nothing matches.
 */
export function ContextualHelpSettings({ canEdit, fallback }: ContextualHelpSettingsProps) {
  const getClient = useHelpwren();
  const changed = useHelpRulesChanged();
  const confirm = useConfirm();
  // `null` adds a rule; a rule edits that one; `undefined` is closed.
  const [editing, setEditing] = useState<HelpRule | null | undefined>(undefined);

  async function reorder(ids: string[]) {
    try {
      await getClient().helpRules.reorder(ids);
    } catch {
      toast.error("The rules could not be reordered. Try again.");
    }
    await changed();
  }

  async function setEnabled(rule: HelpRule, enabled: boolean) {
    const result = await getClient()
      .helpRules.setEnabled(rule.id, enabled)
      .catch(() => ({ ok: false as const }));
    if (!result.ok) toast.error("The rule could not be changed. Try again.");
    await changed();
  }

  function remove(rule: HelpRule) {
    void confirm({
      tone: "destructive",
      icon: "trash",
      title: `Delete “${rule.name}”?`,
      description: "Its pages show what the next matching rule, or the fallback, gives them.",
      confirmLabel: "Delete rule",
      onConfirm: async () => {
        const result = await getClient().helpRules.remove(rule.id);
        if (!result.ok) throw new Error("This rule no longer exists.");
        toast.success("Rule deleted");
        await changed();
      },
    });
  }

  const actions = (rule: HelpRule) =>
    canEdit ? (
      <div className="flex justify-end gap-1">
        <ActionButton
          variant="ghost"
          icon="pencil-simple"
          label="Edit"
          target={rule.name}
          collapseBelow="md"
          onClick={() => {
            setEditing(rule);
          }}
        />
        <ActionButton
          variant="ghost"
          icon="trash"
          label="Delete"
          target={rule.name}
          collapseBelow="md"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            remove(rule);
          }}
        />
      </div>
    ) : null;

  const onSwitch = (rule: HelpRule) =>
    canEdit ? (
      <Switch
        aria-label={`${rule.name} is on`}
        checked={rule.enabled}
        onCheckedChange={(enabled) => void setEnabled(rule, enabled)}
      />
    ) : (
      <Badge variant={rule.enabled ? "accent" : "outline"}>{rule.enabled ? "On" : "Off"}</Badge>
    );

  const columns: DataTableColumn<HelpRule>[] = [
    {
      id: "rule",
      header: "Rule",
      rowHeader: true,
      cell: (rule) => (
        <span className="grid min-w-0 gap-1">
          <span className="truncate font-medium">{rule.name}</span>
          <RuleWhen rule={rule} />
        </span>
      ),
    },
    {
      id: "shows",
      header: "Shows",
      cell: (rule) => (
        <span className="text-muted-foreground line-clamp-2 text-xs">{ruleShows(rule)}</span>
      ),
    },
    { id: "enabled", header: "On", width: "4.5rem", cell: onSwitch },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "9.5rem",
      cell: actions,
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="grid gap-0.5">
          <h3 className="font-medium">Rules</h3>
          <p className="text-muted-foreground text-xs">
            Tried from the top. A page that sets its own filter skips them.
          </p>
        </div>
        {canEdit ? (
          <Button
            onClick={() => {
              setEditing(null);
            }}
          >
            <Icon name="plus" />
            New rule
          </Button>
        ) : null}
      </div>
      <QueryTable<HelpRule>
        queryKey={[...HELP_RULES_QUERY_KEY, "list"]}
        queryFn={async () => ({ items: await getClient().helpRules.list() })}
        // A team keeps a handful of rules, so all of them, to drag into order.
        pagination="none"
        caption="Rules"
        density="compact"
        columns={columns}
        getRowKey={(rule) => rule.id}
        reorder={
          canEdit
            ? { label: (rule) => rule.name, onReorder: (keys) => void reorder(keys.map(String)) }
            : undefined
        }
        renderMobileRow={(rule) => (
          <div className="flex items-center gap-2 py-2.5 pr-2 pl-3">
            <div className="grid min-w-0 flex-1 gap-1">
              <span className="truncate font-medium">{rule.name}</span>
              <RuleWhen rule={rule} />
              <span className="text-muted-foreground line-clamp-2 text-xs">{ruleShows(rule)}</span>
            </div>
            {onSwitch(rule)}
            {actions(rule)}
          </div>
        )}
        empty={
          <EmptyState
            scene="first-article"
            size="sm"
            className="py-10"
            title="No rules yet"
            description="Map a page, such as /bookings/*, to the articles it should show. Pages need no code."
          />
        }
        messages={{ error: "The rules could not be loaded." }}
      />

      <div className="mt-4">
        <PageTester />
        <FallbackSetting canEdit={canEdit} initial={fallback} />
      </div>

      {editing === undefined ? null : (
        <HelpRuleDialog
          rule={editing}
          onClose={() => {
            setEditing(undefined);
          }}
        />
      )}
    </div>
  );
}

/** Says what decided the articles for a page, for the test box. */
function decidedBy(help: PageHelp): string {
  if (help.match?.kind === "rule") return `Rule “${help.match.name}” matched.`;
  if (help.match?.kind === "filter") return "The page's own filter applied.";
  return "No rule matched.";
}

/** Type an address and see what the chat would show there, from the rules as saved. */
function PageTester() {
  const resultId = useId();
  const [result, setResult] = useState<PageHelp | null>(null);
  const form = useForm<TestPageValues>({
    resolver: zodResolver(testPageSchema),
    defaultValues: { url: "", title: "", audience: "" },
  });

  const fields: FieldItem<TestPageValues>[] = [
    {
      name: "url",
      label: "Page address",
      type: "input",
      required: true,
      className: "sm:col-span-2",
      props: {
        type: "url",
        autoComplete: "off",
        spellCheck: false,
        placeholder: "https://app.example.com/bookings/42",
      },
    },
    {
      name: "title",
      label: "Page title",
      type: "input",
      hint: "What the fallback searches for.",
      props: { autoComplete: "off", placeholder: "Bookings" },
    },
    {
      name: "audience",
      label: "Visitor's audience",
      type: "input",
      props: { autoComplete: "off", autoCapitalize: "none", placeholder: "Anyone" },
    },
  ];

  async function run(values: TestPageValues) {
    const answer = await testPage(values).catch(() => null);
    if (!answer?.ok) {
      form.setError("root", { message: "The page could not be tried. Try again." });
      return;
    }
    setResult(answer.help);
  }

  return (
    <SettingsSection
      title="Try a page"
      description="See what the chat's “Help for this page” would list there, from the rules as saved."
    >
      <form
        noValidate
        className="grid gap-4"
        aria-describedby={result ? resultId : undefined}
        onSubmit={(event) => {
          void form.handleSubmit(run)(event);
        }}
      >
        <FieldList control={form.control} fields={fields} columns={2} />
        {form.formState.errors.root ? (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          className="w-fit"
          loading={form.formState.isSubmitting}
        >
          Try it
        </Button>
      </form>
      {result ? (
        <section
          id={resultId}
          aria-label="Test result"
          aria-live="polite"
          className="border-rule grid gap-2 rounded-lg border p-3"
        >
          <p className="text-xs">
            {decidedBy(result)}
            {result.fallback ? ` Searched for “${result.fallback}” instead.` : null}
          </p>
          {result.articles.length === 0 ? (
            <p className="text-muted-foreground text-xs">Nothing would show.</p>
          ) : (
            <ol className="grid gap-1.5">
              {result.articles.map((article) => (
                <li key={article.slug} className="flex items-baseline gap-2 text-sm">
                  <Icon
                    name="file-text"
                    className="text-muted-foreground size-4 shrink-0 self-center"
                  />
                  {article.url ? (
                    <Link href={article.url} external>
                      {article.title}
                    </Link>
                  ) : (
                    <span>{article.title}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </SettingsSection>
  );
}

/** Whether a page that nothing else finds help for searches for its title. */
function FallbackSetting({ canEdit, initial }: { canEdit: boolean; initial: boolean }) {
  const id = useId();
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function change(next: boolean) {
    setSaving(true);
    setOn(next);
    const result = await saveFallback(next).catch(() => ({ ok: false as const }));
    setSaving(false);
    if (result.ok) {
      toast.success(next ? "Fallback search on" : "Fallback search off");
    } else {
      setOn(!next);
      toast.error("The setting could not be saved. Try again.");
    }
  }

  return (
    <SettingsSection
      title="When nothing matches"
      description="With no page filter and no rule that matches, or none that finds an article."
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor={id} className="block font-medium">
            Search for the page&apos;s title
          </label>
          <p id={`${id}-hint`} className="text-muted-foreground text-xs">
            Or for the filter&apos;s words, if it had any. Off, the chat lists nothing for such a
            page.
          </p>
        </div>
        <Switch
          id={id}
          aria-describedby={`${id}-hint`}
          checked={on}
          disabled={!canEdit || saving}
          onCheckedChange={(next) => void change(next)}
        />
      </div>
    </SettingsSection>
  );
}
