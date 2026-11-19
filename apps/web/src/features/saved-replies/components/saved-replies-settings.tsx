"use client";

import { type Agent, type SavedReply, type TeamMember } from "@helpwren/core";
import {
  ActionButton,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Icon,
  QueryList,
  SearchField,
  toast,
  useConfirm,
  type DataTableColumn,
} from "@helpwren/design-system";
import { useState } from "react";

import { useHelpwren } from "@/lib/helpwren-context";
import { useDebounced } from "@/lib/use-debounced";

import { SAVED_REPLIES_QUERY_KEY, useRefreshSavedReplies } from "../hooks/use-saved-replies";
import { SavedReplyDialog } from "./saved-reply-dialog";

/**
 * Whether the signed-in team member may change a reply: their own personal ones, and team ones
 * they wrote or, as an admin, any. The database checks the same.
 */
export function canChange(reply: SavedReply, agent: Pick<Agent, "id" | "role">): boolean {
  if (reply.visibility === "personal") return reply.ownerId === agent.id;
  return agent.role === "admin" || reply.createdBy === agent.id;
}

export interface SavedRepliesSettingsProps {
  agent: Pick<Agent, "id" | "role">;
  /** The team, to name who wrote each reply. */
  members: readonly TeamMember[];
}

/** Settings > Saved replies: every reply this person can use, and the ways to change them. */
export function SavedRepliesSettings({ agent, members }: SavedRepliesSettingsProps) {
  const getClient = useHelpwren();
  const refresh = useRefreshSavedReplies();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const searchText = useDebounced(search.trim(), 250);
  // `null` writes a new reply; a reply edits that one; `undefined` is closed.
  const [editing, setEditing] = useState<SavedReply | null | undefined>(undefined);

  const authorName = (reply: SavedReply) =>
    reply.createdBy === agent.id
      ? "You"
      : (members.find((member) => member.id === reply.createdBy)?.name ?? "A former member");

  function remove(reply: SavedReply) {
    void confirm({
      tone: "destructive",
      icon: "trash",
      title: `Delete “${reply.title}”?`,
      description:
        reply.visibility === "team"
          ? "Nobody on the team will be able to use it any more. This cannot be undone."
          : "You will no longer be able to use it. This cannot be undone.",
      confirmLabel: "Delete reply",
      onConfirm: async () => {
        const result = await getClient().savedReplies.remove(reply.id);
        if (!result.ok) throw new Error("This reply no longer exists, or you cannot delete it.");
        toast.success("Saved reply deleted");
        refresh();
      },
    });
  }

  const actions = (reply: SavedReply) =>
    canChange(reply, agent) ? (
      <div className="flex justify-end gap-1">
        <ActionButton
          variant="ghost"
          icon="pencil-simple"
          label="Edit"
          target={reply.title}
          collapseBelow="md"
          onClick={() => {
            setEditing(reply);
          }}
        />
        <ActionButton
          variant="ghost"
          icon="trash"
          label="Delete"
          target={reply.title}
          collapseBelow="md"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            remove(reply);
          }}
        />
      </div>
    ) : null;

  const visibility = (reply: SavedReply) => (
    <Badge variant={reply.visibility === "team" ? "neutral" : "outline"}>
      {reply.visibility === "team" ? "Team" : "Only you"}
    </Badge>
  );

  const columns: DataTableColumn<SavedReply>[] = [
    {
      id: "title",
      header: "Title",
      rowHeader: true,
      cell: (reply) => (
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate font-medium">{reply.title}</span>
          <span className="text-muted-foreground truncate text-xs">{reply.body}</span>
        </span>
      ),
    },
    {
      id: "shortcut",
      header: "Shortcut",
      width: "7rem",
      cell: (reply) =>
        reply.shortcut ? (
          <span className="font-mono text-xs">/{reply.shortcut}</span>
        ) : (
          <span className="text-muted-foreground">None</span>
        ),
    },
    { id: "visibility", header: "Visibility", width: "6rem", cell: visibility },
    { id: "author", header: "Author", width: "8rem", cell: authorName },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "9.5rem",
      cell: actions,
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <SearchField
          aria-label="Search saved replies"
          placeholder="Search by title or shortcut"
          className="flex-1"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <Button
          onClick={() => {
            setEditing(null);
          }}
        >
          <Icon name="plus" />
          New reply
        </Button>
      </div>
      <QueryList
        queryKey={[...SAVED_REPLIES_QUERY_KEY, "settings", searchText]}
        queryFn={async () => ({
          items: await getClient().savedReplies.list({ search: searchText }),
        })}
        // The whole set, in one go: a team keeps tens of these, not thousands.
        pagination="none"
      >
        {(list) => (
          <DataTable
            caption="Saved replies"
            density="compact"
            columns={columns}
            rows={list.items}
            getRowKey={(reply) => reply.id}
            loading={list.isFetching}
            renderMobileRow={(reply) => (
              <div className="flex items-center gap-2 py-2.5 pr-2 pl-3">
                <div className="grid min-w-0 flex-1 gap-1">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate font-medium">{reply.title}</span>
                    {reply.shortcut ? (
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">
                        /{reply.shortcut}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
                    {visibility(reply)}
                    <span className="truncate">{authorName(reply)}</span>
                  </span>
                </div>
                {actions(reply)}
              </div>
            )}
            empty={
              searchText ? (
                <EmptyState
                  scene="no-results"
                  size="sm"
                  className="py-10"
                  title="No saved replies found"
                  description="Try other words."
                />
              ) : (
                <EmptyState
                  scene="conversations"
                  size="sm"
                  className="py-10"
                  title="No saved replies yet"
                  description="Save the answers you write most often, then type / in any reply to use them."
                  action={
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditing(null);
                      }}
                    >
                      New reply
                    </Button>
                  }
                />
              )
            }
          />
        )}
      </QueryList>
      {editing === undefined ? null : (
        <SavedReplyDialog
          reply={editing}
          onClose={() => {
            setEditing(undefined);
          }}
        />
      )}
    </div>
  );
}
