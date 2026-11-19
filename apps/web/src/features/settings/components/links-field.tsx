"use client";

import { Button, Icon, Input } from "@helpwren/design-system";

import { type LinkRow } from "../schemas";

export interface LinksFieldProps {
  /** What the links are, for the labels of each row: "Header link". */
  noun: string;
  value: readonly LinkRow[];
  onChange: (value: LinkRow[]) => void;
  /** The most links allowed. The Add button goes away once it is reached. */
  max: number;
  /** What is wrong with each row, in the same order, as the form reports it. */
  errors?: unknown;
  disabled?: boolean;
}

/** The first message among a row's problems, whatever shape the form library reports them in. */
function messageFor(errors: unknown, index: number): string | undefined {
  if (!Array.isArray(errors)) return undefined;
  const row = (errors as unknown[])[index];
  if (typeof row !== "object" || row === null) return undefined;
  for (const problem of Object.values(row) as unknown[]) {
    if (typeof problem === "object" && problem !== null && "message" in problem) {
      const { message } = problem;
      if (typeof message === "string") return message;
    }
  }
  return undefined;
}

/** A short list of links to edit: a name and where it goes for each, added and removed in place. */
export function LinksField({
  noun,
  value,
  onChange,
  max,
  errors,
  disabled = false,
}: LinksFieldProps) {
  const change = (index: number, part: Partial<LinkRow>) => {
    onChange(value.map((row, at) => (at === index ? { ...row, ...part } : row)));
  };

  return (
    <div className="grid gap-2">
      {value.map((row, index) => {
        const message = messageFor(errors, index);
        return (
          // Rows have no identity of their own, so their place in the list is their key.
          <div key={index} className="grid gap-1">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`${noun} ${index + 1} name`}
                aria-invalid={message ? true : undefined}
                value={row.label}
                placeholder="Name"
                className="w-2/5"
                disabled={disabled}
                onValueChange={(label) => {
                  change(index, { label });
                }}
              />
              <Input
                aria-label={`${noun} ${index + 1} address`}
                aria-invalid={message ? true : undefined}
                value={row.url}
                placeholder="https://example.com"
                autoCapitalize="none"
                spellCheck={false}
                disabled={disabled}
                onValueChange={(url) => {
                  change(index, { url });
                }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${noun.toLowerCase()} ${index + 1}`}
                disabled={disabled}
                onClick={() => {
                  onChange(value.filter((_, at) => at !== index));
                }}
              >
                <Icon name="x" />
              </Button>
            </div>
            {message ? (
              <p role="alert" className="text-destructive text-xs">
                {message}
              </p>
            ) : null}
          </div>
        );
      })}
      {value.length < max ? (
        <Button
          variant="secondary"
          size="sm"
          className="w-fit"
          disabled={disabled}
          onClick={() => {
            onChange([...value, { label: "", url: "" }]);
          }}
        >
          <Icon name="plus" />
          Add link
        </Button>
      ) : null}
    </div>
  );
}
