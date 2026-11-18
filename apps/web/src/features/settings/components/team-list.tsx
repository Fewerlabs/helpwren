"use client";

import { type TeamMember } from "@helpwren/core";
import { Avatar, Badge, Button, toast, useConfirm } from "@helpwren/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { changeMember } from "../actions";
import { type MemberChange } from "../schemas";

const failures = {
  forbidden: "Only admins can change the team.",
  self: "You cannot change your own access. Ask another admin.",
  last_admin: "The team needs at least one active admin.",
  not_found: "This person is no longer on the team.",
  failed: "The change could not be saved. Try again.",
} as const;

/** Says what a change did, for the toast shown once it is saved. */
function changeMessage(member: TeamMember, change: MemberChange): string {
  if ("role" in change) {
    return `${member.name} is now ${change.role === "admin" ? "an admin" : "an agent"}`;
  }
  return `${member.name} ${change.active ? "reactivated" : "deactivated"}`;
}

export interface TeamListProps {
  members: readonly TeamMember[];
  /** The signed-in team member, who cannot change their own access. */
  currentId: string;
  canEdit: boolean;
}

/** Everyone on the team, with their role and whether they can still sign in. */
export function TeamList({ members, currentId, canEdit }: TeamListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, setPending] = useState<string | null>(null);

  /** Saves a change, or throws an error whose message is written for the person. */
  async function save(member: TeamMember, change: MemberChange) {
    setPending(member.id);
    try {
      const result = await changeMember(member.id, change).catch(() => ({
        ok: false as const,
        reason: "failed" as const,
      }));
      if (!result.ok) throw new Error(failures[result.reason]);
      toast.success(changeMessage(member, change));
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  function change(member: TeamMember, memberChange: MemberChange) {
    save(member, memberChange).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : failures.failed);
    });
  }

  function deactivate(member: TeamMember) {
    // The dialog stays open while it saves, and shows what went wrong in place if it fails.
    void confirm({
      tone: "destructive",
      icon: "lock",
      title: `Deactivate ${member.name}?`,
      description:
        "They will no longer be able to sign in or be given conversations. The ones they hold stay assigned to them. You can reactivate them at any time.",
      confirmLabel: "Deactivate",
      onConfirm: () => save(member, { active: false }),
    });
  }

  return (
    <ul aria-label="Team members" className="border-rule divide-rule divide-y border-y">
      {members.map((member) => {
        const isSelf = member.id === currentId;
        const busy = pending === member.id;
        return (
          <li key={member.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <Avatar name={member.name} size="sm" className="text-2xs size-7" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-medium">
                {member.name}
                {isSelf ? <span className="text-muted-foreground font-normal">(you)</span> : null}
              </p>
              <p className="text-muted-foreground truncate text-xs">{member.email}</p>
            </div>
            <Badge variant={member.role === "admin" ? "accent" : "neutral"}>
              {member.role === "admin" ? "Admin" : "Agent"}
            </Badge>
            {member.active ? null : <Badge variant="outline">Deactivated</Badge>}
            {canEdit && !isSelf ? (
              <div className="flex gap-1">
                {member.active ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`Make ${member.name} ${member.role === "admin" ? "an agent" : "an admin"}`}
                    onClick={() => {
                      change(member, { role: member.role === "admin" ? "agent" : "admin" });
                    }}
                  >
                    {member.role === "admin" ? "Make agent" : "Make admin"}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  aria-label={`${member.active ? "Deactivate" : "Reactivate"} ${member.name}`}
                  onClick={() => {
                    if (member.active) deactivate(member);
                    else change(member, { active: true });
                  }}
                >
                  {member.active ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
