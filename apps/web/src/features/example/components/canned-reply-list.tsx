"use client";

import { Kbd, QueryList, SearchField } from "@helpwren/design-system";
import { useDeferredValue } from "react";

import { listCannedReplies } from "../api/canned-replies";
import { cannedReplyKeys } from "../hooks/use-canned-replies";
import type { CannedReply } from "../schemas/canned-reply";
import { useSearch, useSetSearch } from "../store/example-store";

const PAGE_SIZE = 5;

function CannedReplyRow({ reply }: { reply: CannedReply }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{reply.title}</p>
        <p className="text-muted-foreground line-clamp-2 text-sm">{reply.body}</p>
      </div>
      <Kbd>/{reply.shortcut}</Kbd>
    </div>
  );
}

/** The searchable, paged list of canned replies. */
export function CannedReplyList() {
  const search = useSearch();
  const setSearch = useSetSearch();
  // The list follows the typing a beat behind, so each keystroke is not a request.
  const term = useDeferredValue(search);

  return (
    <div className="grid gap-3">
      <SearchField
        aria-label="Search canned replies"
        placeholder="Search by title, shortcut or text"
        value={search}
        onValueChange={setSearch}
      />
      <QueryList<CannedReply, number>
        aria-label="Canned replies"
        queryKey={cannedReplyKeys.list(term)}
        queryFn={({ cursor, pageSize = PAGE_SIZE, signal }) =>
          listCannedReplies({ search: term, cursor, pageSize, signal })
        }
        pageSize={PAGE_SIZE}
        loadMoreOn="button"
        renderItem={(reply) => <CannedReplyRow reply={reply} />}
        getItemKey={(reply) => reply.id}
        className="border-line bg-card overflow-clip rounded-2xl"
        contentClassName="px-4 py-1"
        listClassName="divide-rule divide-y"
        messages={{
          empty: term === "" ? "No canned replies yet." : "No replies match that search.",
          emptyDescription:
            term === "" ? "Save a reply you send often and insert it with a shortcut." : undefined,
        }}
      />
    </div>
  );
}
