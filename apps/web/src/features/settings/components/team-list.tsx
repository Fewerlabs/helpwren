"use client";

import { type TeamMember } from "@helpwren/core";
import {
  ActionMenu,
  Avatar,
  Badge,
  Dialog,
  DialogContent,
  StatusChip,
  toast,
  useConfirm,
} from "@helpwren/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { changeMember, reinviteMember } from "../actions";
import { type MemberChange } from "../schemas";
import type { InviteDelivery } from "../server/invites";
import { InviteHandoff } from "./invite-handoff";
import { MemberPasswordDialog } from "./member-password-dialog";

const failures = {
  forbidden: "Only admins can change the team.",
  self: "You cannot change your own access. Ask another admin.",
  last_admin: "The team needs at least one active admin.",
  not_found: "This person is no longer on the team.",
  failed: "The change could not be saved. Try again.",
} as const;

const inviteFailures = {
  forbidden: "Only admins can invite people.",
  already_member: "This person is already on the team.",
  self: "You are already on the team.",
  not_found: "This person is no longer on the team.",
  email_unavailable: "Email is not set up. Copy the invite link instead.",
  rate_limited: "You have sent many invites. Wait an hour, or copy the link instead.",
  invalid: "The invite could not be made. Try again.",
  failed: "The invite could not be made. Try again.",
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
  /** The ids of members who have never signed in. */
  invited: readonly string[];
  /** Whether the install can send email, which sending an invite again needs. */
  emailReady: boolean;
  /** The signed-in team member, who cannot change their own access. */
  currentId: string;
  canEdit: boolean;
}

/** Everyone on the team, with their role and whether they can still sign in. */
export function TeamList({ members, invited, emailReady, currentId, canEdit }: TeamListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, setPending] = useState<string | null>(null);
  const [settingPassword, setSettingPassword] = useState<TeamMember | null>(null);
  // A new invite link, shown once for the admin to copy.
  const [handoff, setHandoff] = useState<{
    name: string;
    delivery: Extract<InviteDelivery, { kind: "link" }>;
  } | null>(null);

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

  /** Emails a new invite, or makes a new link to copy. Either way, the old link stops working. */
  async function reinvite(member: TeamMember, method: "email" | "link") {
    setPending(member.id);
    try {
      const result = await reinviteMember(member.id, method).catch(() => ({
        ok: false as const,
        reason: "failed" as const,
      }));
      if (!result.ok) {
        toast.error(inviteFailures[result.reason]);
      } else if (result.delivery.kind === "link") {
        setHandoff({ name: member.name, delivery: result.delivery });
      } else {
        toast.success(`Invite sent to ${member.email}`);
      }
    } finally {
      setPending(null);
    }
  }

  /** A role decides who can change settings and the team, so it is confirmed before it changes. */
  function changeRole(member: TeamMember) {
    const toAdmin = member.role !== "admin";
    void confirm({
      icon: "lock",
      title: toAdmin ? `Make ${member.name} an admin?` : `Make ${member.name} an agent?`,
      description: toAdmin
        ? "Admins can change settings, branding and the team, including other admins."
        : "They will still read and answer conversations, but no longer change settings or the team.",
      confirmLabel: toAdmin ? "Make admin" : "Make agent",
      onConfirm: () => save(member, { role: toAdmin ? "admin" : "agent" }),
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
    <>
      <ul aria-label="Team members" className="border-rule divide-rule divide-y border-y">
        {members.map((member) => {
          const isSelf = member.id === currentId;
          const busy = pending === member.id;
          const isInvited = member.active && invited.includes(member.id);
          return (
            <li key={member.id} className="flex items-center gap-3 py-2.5">
              <Avatar
                name={member.name}
                src={member.photo}
                size="sm"
                className="text-2xs size-7 shrink-0"
              />
              {/* Takes the room the badges and the menu leave, and cuts long names short. */}
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="truncate">{member.name}</span>
                  {isSelf ? (
                    <span className="text-muted-foreground shrink-0 font-normal">(you)</span>
                  ) : null}
                </p>
                <p className="text-muted-foreground truncate text-xs">{member.email}</p>
              </div>
              <Badge variant={member.role === "admin" ? "accent" : "neutral"} className="shrink-0">
                {member.role === "admin" ? "Admin" : "Agent"}
              </Badge>
              {isInvited ? (
                <StatusChip status="waiting" size="sm">
                  Invited
                </StatusChip>
              ) : null}
              {member.active ? null : (
                <Badge variant="outline" className="shrink-0">
                  Deactivated
                </Badge>
              )}
              {canEdit && !isSelf ? (
                <ActionMenu
                  target={member.name}
                  className="ml-auto"
                  items={[
                    ...(isInvited && emailReady
                      ? [
                          {
                            label: "Send invite again",
                            icon: "envelope" as const,
                            disabled: busy,
                            onSelect: () => void reinvite(member, "email"),
                          },
                        ]
                      : []),
                    ...(isInvited
                      ? [
                          {
                            label: "Copy invite link",
                            icon: "link" as const,
                            disabled: busy,
                            onSelect: () => void reinvite(member, "link"),
                          },
                        ]
                      : []),
                    {
                      label: "Set password",
                      icon: "key",
                      disabled: busy,
                      onSelect: () => {
                        setSettingPassword(member);
                      },
                    },
                    ...(member.active
                      ? [
                          {
                            label: member.role === "admin" ? "Make agent" : "Make admin",
                            icon:
                              member.role === "admin"
                                ? ("shield-slash" as const)
                                : ("shield-check" as const),
                            disabled: busy,
                            onSelect: () => {
                              changeRole(member);
                            },
                          },
                        ]
                      : []),
                    {
                      label: member.active ? "Deactivate" : "Reactivate",
                      icon: member.active ? "user-minus" : "user-check",
                      // Taking away someone's access is the one action here that hurts if misclicked.
                      destructive: member.active,
                      disabled: busy,
                      onSelect: () => {
                        if (member.active) deactivate(member);
                        else change(member, { active: true });
                      },
                    },
                  ]}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      <Dialog
        open={handoff !== null}
        onOpenChange={(open) => {
          if (!open) setHandoff(null);
        }}
      >
        <DialogContent>
          {handoff ? (
            <InviteHandoff
              name={handoff.name}
              delivery={handoff.delivery}
              onDone={() => {
                setHandoff(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <MemberPasswordDialog
        member={settingPassword}
        onClose={() => {
          setSettingPassword(null);
        }}
      />
    </>
  );
}
