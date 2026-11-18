"use client";

import { type TeamMember } from "@helpwren/core";
import { Avatar, Badge, Button } from "@helpwren/design-system";
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

export interface TeamListProps {
  members: readonly TeamMember[];
  /** The signed-in team member, who cannot change their own access. */
  currentId: string;
  canEdit: boolean;
}

/** Everyone on the team, with their role and whether they can still sign in. */
export function TeamList({ members, currentId, canEdit }: TeamListProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<keyof typeof failures | null>(null);

  async function change(id: string, memberChange: MemberChange) {
    setPending(id);
    setFailure(null);
    try {
      const result = await changeMember(id, memberChange);
      if (result.ok) {
        router.refresh();
      } else {
        setFailure(result.reason);
      }
    } catch {
      setFailure("failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-3">
      {failure ? (
        <p role="alert" className="text-destructive text-sm">
          {failures[failure]}
        </p>
      ) : null}
      <ul aria-label="Team members" className="border-rule divide-rule divide-y rounded-xl border">
        {members.map((member) => {
          const isSelf = member.id === currentId;
          const busy = pending === member.id;
          return (
            <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={member.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {member.name}
                  {isSelf ? <span className="text-muted-foreground font-normal">(you)</span> : null}
                </p>
                <p className="text-muted-foreground truncate text-sm">{member.email}</p>
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
                        void change(member.id, {
                          role: member.role === "admin" ? "agent" : "admin",
                        });
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
                      void change(member.id, { active: !member.active });
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
    </div>
  );
}
