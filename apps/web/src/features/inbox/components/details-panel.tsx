"use client";

import { type ConversationWithContact } from "@helpwren/core";
import { Badge, Link } from "@helpwren/design-system";
import { type ReactNode } from "react";

import { Panel, PanelHeader } from "@/features/dashboard";

const startedFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-rule border-b px-4 py-4 last:border-b-0">
      <h3 className="text-muted-foreground pb-2 text-xs">{title}</h3>
      <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
        {children}
      </dl>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

const missing = <span className="text-muted-foreground">Not given</span>;

/** A page address without its scheme, which is how people read one. */
function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export interface DetailsPanelProps {
  conversation: ConversationWithContact;
  className?: string;
}

/** The right panel: who the team is talking to, and where they wrote from. */
export function DetailsPanel({ conversation, className }: DetailsPanelProps) {
  const { contact, context } = conversation;
  const page = typeof context.url === "string" ? context.url : undefined;
  const pageTitle = typeof context.title === "string" ? context.title : undefined;

  return (
    <Panel aria-label="Details" className={className}>
      <PanelHeader>
        <h2 className="text-sm font-semibold">Details</h2>
      </PanelHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Contact">
          <Row label="Name">{contact.name ?? missing}</Row>
          <Row label="Email">
            {contact.email ? (
              <Link href={`mailto:${contact.email}`}>{contact.email}</Link>
            ) : (
              missing
            )}
          </Row>
          <Row label="Phone">
            {contact.phone ? <Link href={`tel:${contact.phone}`}>{contact.phone}</Link> : missing}
          </Row>
          <Row label="Type">
            {contact.kind === "guest" ? (
              <Badge variant="outline">Guest</Badge>
            ) : contact.verified ? (
              <Badge variant="accent">Verified user</Badge>
            ) : (
              <Badge variant="outline">Unverified user</Badge>
            )}
          </Row>
        </Section>
        <Section title="Conversation">
          <Row label="Started">{startedFormat.format(new Date(conversation.createdAt))}</Row>
          <Row label="Source">
            <span className="font-mono text-xs">{conversation.source}</span>
          </Row>
          <Row label="Page">
            {page ? (
              <Link href={page} external>
                {pageTitle ?? shortUrl(page)}
              </Link>
            ) : (
              <span className="text-muted-foreground">Unknown</span>
            )}
          </Row>
        </Section>
      </div>
    </Panel>
  );
}
