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

export type AgentRole = z.infer<typeof agentRoleSchema>;
export type Agent = z.infer<typeof agentSchema>;

export function createAgents(supabase: HelpwrenSupabaseClient) {
  return {
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
