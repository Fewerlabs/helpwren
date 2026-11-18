"use client";

import { LOGO_MAX_BYTES, LOGO_TYPES } from "@helpwren/core";
import { Button, Logo } from "@helpwren/design-system";
import { useRef, useState } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

const failures = {
  forbidden: "Only admins can change the logo.",
  too_large: "That file is over 1 MB. Choose a smaller one.",
  unsupported: "Choose a PNG, JPG or WebP image.",
  failed: "The logo could not be uploaded. Try again.",
} as const;

export interface LogoFieldProps {
  /** The address of the logo, or empty when there is none. */
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

/**
 * The brand's logo: what is there now, and a way to upload another or take it away. The file is
 * stored when it is chosen; the brand only uses it once the form is saved.
 */
export function LogoField({ value, onChange, disabled }: LogoFieldProps) {
  const getClient = useHelpwren();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState<keyof typeof failures | null>(null);

  async function upload(file: File) {
    setFailure(null);
    if (file.size > LOGO_MAX_BYTES) {
      setFailure("too_large");
      return;
    }
    setUploading(true);
    try {
      const result = await getClient().settings.uploadLogo(file);
      if (result.ok) onChange(result.url);
      else setFailure(result.reason);
    } catch {
      setFailure("failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <div className="border-rule bg-muted/40 grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- from the install's own storage, whose host the optimiser does not know
            <img src={value} alt="Current logo" className="size-full object-contain" />
          ) : (
            <Logo variant="mark" size={28} label="" />
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={uploading}
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          {value ? "Replace logo" : "Upload logo"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => {
              setFailure(null);
              onChange("");
            }}
          >
            Remove
          </Button>
        ) : null}
        <input
          ref={input}
          type="file"
          aria-label="Logo file"
          accept={Object.keys(LOGO_TYPES).join(",")}
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared, so choosing the same file again after a failure still counts as a change.
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
      {failure ? (
        <p role="alert" className="text-destructive text-xs">
          {failures[failure]}
        </p>
      ) : null}
    </div>
  );
}
