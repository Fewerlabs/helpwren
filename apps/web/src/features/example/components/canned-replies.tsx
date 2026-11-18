"use client";

import { Button, Icon, PageHeader } from "@helpwren/design-system";

import { useSetComposerOpen } from "../store/example-store";
import { CannedReplyForm } from "./canned-reply-form";
import { CannedReplyList } from "./canned-reply-list";

/** The whole feature: a header with its action, the list, and the dialog for a new reply. */
export function CannedReplies() {
  const setComposerOpen = useSetComposerOpen();

  return (
    <section className="grid gap-5" aria-labelledby="canned-replies-title">
      <PageHeader
        headingLevel={2}
        eyebrow="Example feature"
        title={<span id="canned-replies-title">Canned replies</span>}
        description="Saved replies an agent can insert with a shortcut."
        actions={
          <Button
            onClick={() => {
              setComposerOpen(true);
            }}
          >
            <Icon name="plus" />
            New reply
          </Button>
        }
      />
      <CannedReplyList />
      <CannedReplyForm />
    </section>
  );
}
