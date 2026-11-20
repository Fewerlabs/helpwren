"use client";

import { type Brand, type EmailTemplate, type EmailTemplateKind } from "@helpwren/core";
import { useMemo, useState } from "react";

import { buildEmail, sampleEmail } from "@/lib/email/templates";

export interface EmailPreviewProps {
  brand: Brand;
  kind: EmailTemplateKind;
  /** The words in the form, saved or not. */
  template: EmailTemplate | undefined;
  /** Who it is from, as the contact's mail app would show it. */
  from: string;
}

/**
 * One email as a contact would open it, with made-up details in its placeholders: the subject
 * and sender above, and the email itself below, in a frame so its own styles stay its own.
 */
export function EmailPreview({ brand, kind, template, from }: EmailPreviewProps) {
  const email = useMemo(
    () => buildEmail(sampleEmail({ brand, kind, template })),
    [brand, kind, template],
  );
  const [height, setHeight] = useState(520);

  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-2xs font-mono tracking-wider uppercase">
        Live preview
      </p>
      <div
        role="region"
        aria-label="Email preview"
        className="border-rule bg-card overflow-hidden rounded-2xl border"
      >
        <dl className="border-rule grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 border-b px-4 py-3 text-xs">
          <dt className="text-muted-foreground">From</dt>
          <dd className="truncate">{from}</dd>
          <dt className="text-muted-foreground">To</dt>
          <dd className="truncate">Amara</dd>
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="truncate font-medium">{email.subject}</dd>
        </dl>
        <iframe
          title="The email's body"
          srcDoc={email.html}
          sandbox="allow-same-origin"
          className="block w-full bg-white"
          style={{ height }}
          onLoad={(event) => {
            const body = event.currentTarget.contentDocument?.documentElement;
            if (body) setHeight(body.scrollHeight);
          }}
        />
      </div>
    </div>
  );
}
