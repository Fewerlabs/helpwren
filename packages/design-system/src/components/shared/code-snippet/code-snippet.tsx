"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";

import { cn } from "#lib/cn";

import { Button } from "../../base/button/button";
import { Icon } from "../../base/icon/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../base/tabs/tabs";
import { toast } from "../../base/toast/toast";
import { tokenize, type TokenKind } from "./tokenize";

/** One version of a snippet, such as the same install step for another framework. */
export interface CodeSnippetTab {
  /** Shown on the tab. Each tab needs its own. */
  label: string;
  code: string;
  /** Decides the colouring: `html`, `js`, `jsx`, `ts`, `tsx` or `shell`. Others show plain. */
  language?: string;
}

interface CommonProps extends Omit<ComponentProps<"div">, "children"> {
  /**
   * `block` is a code block with a header. `inline` is one line for a single value, such as
   * a link or a key: the value, a copy button and an optional link that opens it.
   */
  variant?: "block" | "inline";
  /** Wraps long lines instead of scrolling sideways. For a block. */
  wrap?: boolean;
  /** Numbers the lines. For a block. */
  lineNumbers?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
  /** Called after the code has been copied. */
  onCopied?: (code: string) => void;
  /** Shown as a toast after copying. The screen needs a `Toaster`. */
  copiedMessage?: string;
  /** For `inline`: an address the value opens at, shown as a link beside the copy button. */
  openHref?: string;
  openLabel?: string;
  /** Names the row of tabs for assistive technology. */
  tabsLabel?: string;
}

interface SingleSource {
  /** The code to show and to copy. */
  code: string;
  /** Shown above the code, such as "HTML", and decides the colouring. */
  language?: string;
  tabs?: never;
}

interface TabbedSource {
  /** Several versions of one snippet. The copy button copies the open one. */
  tabs: readonly CodeSnippetTab[];
  code?: never;
  language?: never;
}

export type CodeSnippetProps = CommonProps & (SingleSource | TabbedSource);

/** How long the button says "Copied" before going back. */
const COPIED_FOR_MS = 2000;

const tokenColours: Record<Exclude<TokenKind, "plain">, string> = {
  tag: "text-biro",
  attribute: "text-ochre",
  string: "text-moss",
  keyword: "text-pen",
  number: "text-ochre",
  comment: "text-muted-foreground italic",
};

interface CodeBodyProps {
  code: string;
  language: string | undefined;
  wrap: boolean;
  lineNumbers: boolean;
}

function CodeBody({ code, language, wrap, lineNumbers }: CodeBodyProps) {
  const lines = useMemo(() => tokenize(code, language), [code, language]);

  return (
    <pre
      // A scrolling region must be reachable by keyboard so it can be scrolled without a mouse.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see the line above.
      tabIndex={0}
      className={cn(
        "overflow-x-auto py-3 font-mono text-[0.8125rem] leading-relaxed outline-offset-[-2px]",
        // Code is read character by character: no ligatures, and a scrollbar that stays quiet.
        "[scrollbar-width:thin] [scrollbar-color:var(--color-rule)_transparent] [font-variant-ligatures:none]",
        wrap && "break-words whitespace-pre-wrap",
      )}
    >
      {/* As wide as its longest line, so the padding on the right survives scrolling. */}
      <code className={cn("block px-4", !wrap && "w-max min-w-full")}>
        {lines.map((tokens, line) => (
          <span
            // A line is known only by where it is; lines are never reordered.
            key={line}
            className={lineNumbers ? "grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4" : "block"}
          >
            {lineNumbers ? (
              <span aria-hidden="true" className="text-muted-foreground text-right select-none">
                {line + 1}
              </span>
            ) : null}
            <span>
              {tokens.map((token, part) =>
                token.kind === "plain" ? (
                  token.text
                ) : (
                  <span key={part} className={tokenColours[token.kind]}>
                    {token.text}
                  </span>
                ),
              )}
              {"\n"}
            </span>
          </span>
        ))}
      </code>
    </pre>
  );
}

/**
 * Code to read and copy. As a block it has a header, colours for HTML, JavaScript, TypeScript
 * and shell, and tabs for several versions of one snippet. `variant="inline"` is one line for
 * a single value such as a link.
 */
export function CodeSnippet({
  code,
  language,
  tabs,
  variant = "block",
  wrap = false,
  lineNumbers = false,
  copyLabel = "Copy",
  copiedLabel = "Copied",
  onCopied,
  copiedMessage,
  openHref,
  openLabel = "Open",
  tabsLabel = "Versions",
  className,
  ...props
}: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  // The open tab, falling back to the first when the one chosen is no longer among them.
  const open = tabs?.find((tab) => tab.label === chosen) ?? tabs?.[0];
  const shown = open?.code ?? code ?? "";

  async function copy() {
    await navigator.clipboard.writeText(shown);
    onCopied?.(shown);
    if (copiedMessage !== undefined) toast.success(copiedMessage);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
    }, COPIED_FOR_MS);
  }

  if (variant === "inline") {
    return (
      <div
        data-slot="code-snippet"
        data-variant="inline"
        className={cn(
          "border-rule bg-card flex min-h-10 items-center gap-1 rounded-lg border py-1 pr-1 pl-3",
          className,
        )}
        {...props}
      >
        <code
          // It scrolls sideways when the value is long, which the keyboard must be able to do.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see the line above.
          tabIndex={0}
          className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto rounded-sm font-mono text-[0.8125rem] whitespace-nowrap outline-offset-2 [font-variant-ligatures:none] [&::-webkit-scrollbar]:hidden"
        >
          {shown}
        </code>
        {openHref === undefined ? null : (
          <Button asChild variant="ghost" size="sm">
            <a href={openHref} target="_blank" rel="noreferrer noopener">
              {openLabel}
              <Icon name="arrow-square-out" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={copied ? copiedLabel : copyLabel}
          onClick={() => {
            void copy();
          }}
        >
          <Icon name={copied ? "check" : "copy"} />
        </Button>
        {/* A changed label is not read out, so the change is said here. */}
        <span className="sr-only" aria-live="polite">
          {copied ? copiedLabel : ""}
        </span>
      </div>
    );
  }

  const copyButton = (
    <Button
      variant="ghost"
      size="sm"
      className="shrink-0"
      onClick={() => {
        void copy();
      }}
    >
      <Icon name={copied ? "check" : "copy"} />
      <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
    </Button>
  );
  const header =
    "border-rule bg-muted/50 flex items-center justify-between gap-3 border-b py-1 pr-1";
  const box = cn("border-rule bg-card overflow-hidden rounded-xl border", className);

  if (tabs && open) {
    return (
      <div data-slot="code-snippet" className={box} {...props}>
        <Tabs value={open.label} onValueChange={setChosen} className="gap-0">
          <div className={cn(header, "pl-1")}>
            <TabsList
              aria-label={tabsLabel}
              className="bg-transparent p-0 group-data-horizontal/tabs:h-8"
            >
              {tabs.map((tab) => (
                <TabsTrigger key={tab.label} value={tab.label} className="px-2.5 text-xs">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {copyButton}
          </div>
          {tabs.map((tab) => (
            // The code inside takes the focus, so that it can be scrolled; the panel need not.
            <TabsContent key={tab.label} value={tab.label} tabIndex={-1}>
              <CodeBody
                code={tab.code}
                language={tab.language}
                wrap={wrap}
                lineNumbers={lineNumbers}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  return (
    <div data-slot="code-snippet" className={box} {...props}>
      <div className={cn(header, "pl-4")}>
        <span className="text-muted-foreground text-2xs font-mono tracking-wide uppercase">
          {language}
        </span>
        {copyButton}
      </div>
      <CodeBody code={shown} language={language} wrap={wrap} lineNumbers={lineNumbers} />
    </div>
  );
}
