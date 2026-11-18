"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";

import { cn } from "#lib/cn";

import { Button } from "../../base/button/button";
import { Icon } from "../../base/icon/icon";

export interface CodeSnippetProps extends Omit<ComponentProps<"div">, "children"> {
  /** The code to show and to copy. */
  code: string;
  /** Shown above the code, such as "HTML" or a file name. */
  language?: string;
  /** Wraps long lines instead of scrolling sideways. */
  wrap?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
  /** Called after the code has been copied. */
  onCopied?: (code: string) => void;
}

/** How long the button says "Copied" before going back. */
const COPIED_FOR_MS = 2000;

/** A block of code with a button that copies it, such as the widget install snippet. */
export function CodeSnippet({
  code,
  language,
  wrap = false,
  copyLabel = "Copy",
  copiedLabel = "Copied",
  onCopied,
  className,
  ...props
}: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    await navigator.clipboard.writeText(code);
    onCopied?.(code);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
    }, COPIED_FOR_MS);
  }

  return (
    <div
      data-slot="code-snippet"
      className={cn("border-line bg-card overflow-hidden rounded-xl", className)}
      {...props}
    >
      <div className="border-rule flex items-center justify-between gap-3 border-b py-1 pr-1 pl-4">
        <span className="text-muted-foreground text-2xs font-mono tracking-wide uppercase">
          {language}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void copy();
          }}
        >
          <Icon name={copied ? "check" : "copy"} />
          <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
        </Button>
      </div>
      <pre
        // A scrolling region must be reachable by keyboard so it can be scrolled without a mouse.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see the line above.
        tabIndex={0}
        className={cn(
          "overflow-x-auto p-4 font-mono text-sm leading-relaxed outline-offset-[-2px]",
          wrap && "break-words whitespace-pre-wrap",
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
