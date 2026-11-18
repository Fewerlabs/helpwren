import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/** A named group of team members, such as Billing, that conversations can be given to. */
export const teamSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    members: z.array(z.object({ agent_id: z.uuid() })),
  })
  .transform((row) => ({
    id: row.id,
    name: row.name,
    /** The ids of the team members in it. */
    memberIds: row.members.map((member) => member.agent_id),
  }));

export type Team = z.infer<typeof teamSchema>;

export const teamNameSchema = z.string().trim().min(1).max(60);

export type ChangeTeamResult =
  { ok: true } | { ok: false; reason: "forbidden" | "name_taken" | "not_found" };
export type CreateTeamResult =
  { ok: true; team: Team } | { ok: false; reason: "forbidden" | "name_taken" };

const COLUMNS = "id, name, members:team_members(agent_id)";

/** Postgres's codes for an action the access rules refuse, and for a value already in use. */
const NOT_ALLOWED = "42501";
const TAKEN = "23505";

function refusal(code: string | undefined): "forbidden" | "name_taken" | undefined {
  if (code === NOT_ALLOWED) return "forbidden";
  if (code === TAKEN) return "name_taken";
  return undefined;
}

export function createTeams(supabase: HelpwrenSupabaseClient) {
  return {
    /** Every team, by name, with who is in it. Only team members get any. */
    async list(): Promise<Team[]> {
      const { data, error } = await supabase.from("teams").select(COLUMNS).order("name");
      if (error) throw new HelpwrenError("Could not load the teams.", { cause: error });
      return z.array(teamSchema).parse(data);
    },

    /** Makes a team, with nobody in it yet. Only an admin may. */
    async create(name: string): Promise<CreateTeamResult> {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name: teamNameSchema.parse(name) })
        .select(COLUMNS)
        .single();
      if (error) {
        const reason = refusal(error.code);
        if (reason) return { ok: false, reason };
        throw new HelpwrenError("Could not make the team.", { cause: error });
      }
      return { ok: true, team: teamSchema.parse(data) };
    },

    async rename(id: string, name: string): Promise<ChangeTeamResult> {
      const { data, error } = await supabase
        .from("teams")
        .update({ name: teamNameSchema.parse(name) })
        .eq("id", id)
        .select("id");
      if (error) {
        const reason = refusal(error.code);
        if (reason) return { ok: false, reason };
        throw new HelpwrenError("Could not rename the team.", { cause: error });
      }
      // The access rules hide the row from anyone who may not change it, so nothing comes back.
      return data.length === 0 ? { ok: false, reason: "not_found" } : { ok: true };
    },

    /** Removes a team. Its conversations stay, with no team. */
    async remove(id: string): Promise<ChangeTeamResult> {
      const { data, error } = await supabase.from("teams").delete().eq("id", id).select("id");
      if (error) throw new HelpwrenError("Could not remove the team.", { cause: error });
      return data.length === 0 ? { ok: false, reason: "not_found" } : { ok: true };
    },

    /** Sets exactly who is in a team: adds those missing and takes out the rest. */
    async setMembers(id: string, agentIds: readonly string[]): Promise<ChangeTeamResult> {
      const wanted = z.array(z.uuid()).parse([...new Set(agentIds)]);
      const { data: current, error } = await supabase
        .from("team_members")
        .select("agent_id")
        .eq("team_id", id);
      if (error) throw new HelpwrenError("Could not load the team's members.", { cause: error });

      const have = current.map((member) => member.agent_id);
      const toAdd = wanted.filter((agentId) => !have.includes(agentId));
      const toRemove = have.filter((agentId) => !wanted.includes(agentId));

      if (toAdd.length > 0) {
        const added = await supabase
          .from("team_members")
          .insert(toAdd.map((agentId) => ({ team_id: id, agent_id: agentId })));
        if (added.error) {
          if (added.error.code === NOT_ALLOWED) return { ok: false, reason: "forbidden" };
          throw new HelpwrenError("Could not add to the team.", { cause: added.error });
        }
      }
      if (toRemove.length > 0) {
        const removed = await supabase
          .from("team_members")
          .delete()
          .eq("team_id", id)
          .in("agent_id", toRemove)
          .select("agent_id");
        if (removed.error) {
          throw new HelpwrenError("Could not take people out of the team.", {
            cause: removed.error,
          });
        }
        // Nothing removed when something should have been: the access rules refused it.
        if (removed.data.length === 0) return { ok: false, reason: "forbidden" };
      }
      return { ok: true };
    },
  };
}

export type TeamsApi = ReturnType<typeof createTeams>;
