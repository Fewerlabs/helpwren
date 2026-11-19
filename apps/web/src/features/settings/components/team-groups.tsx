"use client";

import { type Team, type TeamMember } from "@helpwren/core";
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FieldList,
  Icon,
  toast,
  useConfirm,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useHelpwren } from "@/lib/helpwren-context";

import { teamGroupSchema, type TeamGroupValues } from "../schemas";

const failures = {
  forbidden: "Only admins can change teams.",
  name_taken: "There is already a team with this name.",
  not_found: "This team no longer exists.",
  failed: "The team could not be saved. Try again.",
} as const;

/** Reloads the teams here, and wherever else they are held, such as the inbox's navigation. */
function useRefreshTeams() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return () => {
    router.refresh();
    void queryClient.invalidateQueries({ queryKey: ["teams"] });
  };
}

/** How many faces a team shows before the rest become a number. */
const FACES = 5;

interface TeamDialogProps {
  /** The team being changed, or `null` to make a new one. */
  team: Team | null;
  members: readonly TeamMember[];
  onClose: () => void;
}

/** The form for a team's name and who is in it, for a new team or an existing one. */
function TeamDialog({ team, members, onClose }: TeamDialogProps) {
  const refresh = useRefreshTeams();
  const getClient = useHelpwren();
  const form = useForm<TeamGroupValues>({
    resolver: zodResolver(teamGroupSchema),
    defaultValues: { name: team?.name ?? "", memberIds: team?.memberIds ?? [] },
  });

  const fields: FieldItem<TeamGroupValues>[] = [
    {
      name: "name",
      label: "Name",
      type: "input",
      required: true,
      props: { autoComplete: "off", placeholder: "Billing" },
    },
    {
      name: "memberIds",
      label: "Members",
      type: "combobox",
      hint: "Someone can be in more than one team.",
      props: {
        multiple: true,
        placeholder: "Choose people",
        // Someone deactivated cannot be given work, so they are not offered.
        options: members
          .filter((member) => member.active || team?.memberIds.includes(member.id))
          .map((member) => ({ value: member.id, label: member.name })),
      },
    },
  ];

  /** Saves the team, or says which part of it was refused. */
  async function store(values: TeamGroupValues): Promise<keyof typeof failures | null> {
    const teams = getClient().teams;
    let id = team?.id;
    if (id === undefined) {
      const created = await teams.create(values.name);
      if (!created.ok) return created.reason;
      id = created.team.id;
    } else if (values.name !== team?.name) {
      const renamed = await teams.rename(id, values.name);
      if (!renamed.ok) return renamed.reason;
    }
    const set = await teams.setMembers(id, values.memberIds);
    return set.ok ? null : set.reason;
  }

  async function save(values: TeamGroupValues) {
    const refused = await store(values).catch(() => "failed" as const);
    if (refused === "name_taken") {
      form.setError("name", { message: failures.name_taken });
    } else if (refused) {
      form.setError("root", { message: failures[refused] });
    } else {
      toast.success(team ? "Team saved" : "Team added");
      refresh();
      onClose();
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "Edit team" : "New team"}</DialogTitle>
          <DialogDescription>
            A team is a group that conversations can be given to, such as Billing or Support.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            void form.handleSubmit(save)(event);
          }}
        >
          <FieldList
            control={form.control}
            fields={fields}
            disabled={form.formState.isSubmitting}
          />
          {form.formState.errors.root ? (
            <p role="alert" className="text-destructive text-sm">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {team ? "Save team" : "Add team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface TeamGroupsProps {
  teams: readonly Team[];
  members: readonly TeamMember[];
  canEdit: boolean;
}

/** The install's teams: each with who is in it, and for admins the ways to change them. */
export function TeamGroups({ teams, members, canEdit }: TeamGroupsProps) {
  const refresh = useRefreshTeams();
  const getClient = useHelpwren();
  const confirm = useConfirm();
  // `null` makes a new team; a team edits that one; `undefined` is closed.
  const [editing, setEditing] = useState<Team | null | undefined>(undefined);

  function remove(team: Team) {
    void confirm({
      tone: "destructive",
      icon: "trash",
      title: `Remove ${team.name}?`,
      description:
        "Its conversations stay where they are, with no team. The people in it are not affected.",
      confirmLabel: "Remove team",
      onConfirm: async () => {
        const result = await getClient().teams.remove(team.id);
        if (!result.ok) throw new Error(failures[result.reason]);
        toast.success("Team removed");
        refresh();
      },
    });
  }

  return (
    <section aria-labelledby="teams-heading" className="pt-10">
      <header className="flex items-start justify-between gap-4 pb-4">
        <div className="grid gap-1">
          <h3 id="teams-heading" className="font-semibold">
            Teams
          </h3>
          <p className="text-muted-foreground">
            Groups a conversation can be given to, so the right people see it.
          </p>
        </div>
        {canEdit ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditing(null);
            }}
          >
            <Icon name="plus" />
            New team
          </Button>
        ) : null}
      </header>

      {teams.length === 0 ? (
        <EmptyState
          scene={false}
          size="sm"
          headingLevel={4}
          className="border-rule rounded-xl border py-8"
          title="No teams yet"
          description="Make one for each kind of work, such as Billing or Support."
        />
      ) : (
        <ul aria-label="Teams" className="border-rule divide-rule divide-y border-y">
          {teams.map((team) => {
            const people = members.filter((member) => team.memberIds.includes(member.id));
            return (
              <li key={team.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{team.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {people.length === 0
                      ? "Nobody yet"
                      : `${people.length} ${people.length === 1 ? "person" : "people"}`}
                  </p>
                </div>
                <div className="flex -space-x-1.5" aria-hidden="true">
                  {people.slice(0, FACES).map((member) => (
                    <Avatar
                      key={member.id}
                      name={member.name}
                      src={member.photo}
                      size="sm"
                      className="ring-card text-2xs size-6 ring-2"
                    />
                  ))}
                  {people.length > FACES ? (
                    <span className="bg-muted ring-card text-2xs grid size-6 place-items-center rounded-full ring-2">
                      +{people.length - FACES}
                    </span>
                  ) : null}
                </div>
                {canEdit ? (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${team.name}`}
                      onClick={() => {
                        setEditing(team);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${team.name}`}
                      onClick={() => {
                        remove(team);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editing === undefined ? null : (
        <TeamDialog
          // A fresh form for each team, so one team's values never show for another.
          key={editing?.id ?? "new"}
          team={editing}
          members={members}
          onClose={() => {
            setEditing(undefined);
          }}
        />
      )}
    </section>
  );
}
