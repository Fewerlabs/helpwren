import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

export const agentRoleSchema = z.enum(["admin", "agent"]);

export const agentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: agentRoleSchema,
});

/** A team member as the team list shows them, including those who have been deactivated. */
export const teamMemberSchema = agentSchema.extend({ active: z.boolean() });

export type AgentRole = z.infer<typeof agentRoleSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type Agent = z.infer<typeof agentSchema>;

export function createAgents(supabase: HelpwrenSupabaseClient) {
  return {
    /** Everyone on the team, by name. Only a signed-in, active team member gets any. */
    async list(): Promise<TeamMember[]> {
      const { data, error } = await supabase
        .from("agents")
        .select("id:user_id, name, email, role, active")
        .order("name");
      if (error) throw new HelpwrenError("Could not load the team.", { cause: error });
      return z.array(teamMemberSchema).parse(data);
    },

    /**
     * The signed-in team member, or `null` if nobody is signed in or the person signed in is
     * not an active agent.
     */
    async me(): Promise<Agent | null> {
      const { data: claims } = await supabase.auth.getClaims();
      if (!claims) return null;

      const { data, error } = await supabase
        .from("agents")
        .select("id:user_id, name, email, role")
        .eq("user_id", claims.claims.sub)
        .maybeSingle();

      if (error) throw new HelpwrenError("Could not load the signed-in agent.", { cause: error });
      if (!data) return null;

      const agent = agentSchema.safeParse(data);
      if (!agent.success) {
        throw new HelpwrenError("The signed-in agent has an unexpected shape.", {
          cause: agent.error,
        });
      }
      return agent.data;
    },
  };
}

export type AgentsApi = ReturnType<typeof createAgents>;
