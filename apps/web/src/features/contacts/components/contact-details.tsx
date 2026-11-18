"use client";

import { type ConversationWithContact } from "@helpwren/core";
import {
  Avatar,
  Button,
  Icon,
  Link,
  QueryDetail,
  QueryList,
  StatusChip,
} from "@helpwren/design-system";
import NextLink from "next/link";
import { type ReactNode } from "react";

import { Panel, PanelHeader } from "@/features/dashboard";
import { formatTimeAgo } from "@/lib/format-time";
import { useHelpwren } from "@/lib/helpwren-context";

import { contactLabel } from "../contact-label";
import { CONTACTS_QUERY_KEY } from "../hooks/use-contacts";
import { KindBadge } from "./kind-badge";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const chipFor = {
  open: "open",
  pending: "waiting",
  resolved: "resolved",
  closed: "closed",
} as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

const missing = <span className="text-muted-foreground">Not given</span>;
const eyebrow = "text-muted-foreground text-2xs px-3 pt-3 pb-2 font-mono tracking-wider uppercase";

export interface ContactDetailsProps {
  contactId: string;
  onClose: () => void;
  className?: string;
}

/** One contact: how to reach them, and every conversation they have had. */
export function ContactDetails({ contactId, onClose, className }: ContactDetailsProps) {
  const getClient = useHelpwren();

  return (
    <Panel aria-label="Contact" className={className}>
      <PanelHeader className="justify-between">
        <h2 className="font-semibold">Contact</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close contact" onClick={onClose}>
          <Icon name="x" />
        </Button>
      </PanelHeader>
      <QueryDetail
        queryKey={[...CONTACTS_QUERY_KEY, "one", contactId]}
        queryFn={() => getClient().contacts.get(contactId)}
        messages={{
          loading: "Loading contact",
          empty: "This contact could not be found.",
          error: "This contact could not be loaded.",
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {(contact) => {
          const label = contactLabel(contact);
          return (
            <>
              <div className="border-rule flex items-center gap-3 border-b px-3 py-3.5">
                <Avatar name={label} />
                <div className="grid min-w-0 gap-1">
                  <p className="truncate font-semibold">{label}</p>
                  <div>
                    <KindBadge contact={contact} />
                  </div>
                </div>
              </div>

              <section className="border-rule border-b pb-3">
                <h3 className={eyebrow}>Details</h3>
                <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 text-xs">
                  <Row label="Email">
                    {contact.email ? (
                      <Link href={`mailto:${contact.email}`}>{contact.email}</Link>
                    ) : (
                      missing
                    )}
                  </Row>
                  <Row label="Phone">
                    {contact.phone ? (
                      <Link href={`tel:${contact.phone}`}>{contact.phone}</Link>
                    ) : (
                      missing
                    )}
                  </Row>
                  {contact.organisation ? <Row label="Company">{contact.organisation}</Row> : null}
                  <Row label="First seen">{dateFormat.format(new Date(contact.firstSeenAt))}</Row>
                </dl>
              </section>

              <section>
                <h3 className={eyebrow}>Conversations</h3>
                <QueryList<ConversationWithContact, string>
                  aria-label="Conversations"
                  queryKey={[...CONTACTS_QUERY_KEY, "conversations", contactId]}
                  queryFn={({ cursor, pageSize }) =>
                    getClient().conversations.list({ contactId, cursor, limit: pageSize })
                  }
                  pageSize={20}
                  loadMoreOn="button"
                  loadingRows={1}
                  getItemKey={(conversation) => conversation.id}
                  renderItem={(conversation) => (
                    <NextLink
                      href={`/dashboard/inbox?view=all&c=${conversation.id}`}
                      className="hover:bg-muted/60 focus-visible:outline-ring grid gap-0.5 rounded-lg px-2 py-1.5 focus-visible:outline-2"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <StatusChip status={chipFor[conversation.status]} size="sm" />
                        {conversation.lastMessageAt ? (
                          <span className="text-muted-foreground text-2xs tabular-nums">
                            {formatTimeAgo(conversation.lastMessageAt)}
                          </span>
                        ) : null}
                      </span>
                      <span className="truncate text-xs">{conversation.lastMessagePreview}</span>
                    </NextLink>
                  )}
                  renderEmpty={() => (
                    <p className="text-muted-foreground px-1.5 text-xs">No conversations yet.</p>
                  )}
                  renderEnd={() => null}
                  messages={{ error: "Their conversations could not be loaded." }}
                  contentClassName="px-1.5 pb-2"
                  listClassName="flex flex-col gap-px"
                />
              </section>
            </>
          );
        }}
      </QueryDetail>
    </Panel>
  );
}
