import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

export const agentRoleSchema = z.enum(["admin", "agent"]);

export const agentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: agentRoleSchema,
  /** The address of their photo, when they have uploaded one. */
  photo: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
});

/** A team member as the team list shows them, including those who have been deactivated. */
export const teamMemberSchema = agentSchema.extend({ active: z.boolean() });

export type AgentRole = z.infer<typeof agentRoleSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type Agent = z.infer<typeof agentSchema>;

/** Where photos are kept, and what one may be. The bucket enforces the same limits. */
const PHOTO_BUCKET = "avatars";
export const PHOTO_MAX_BYTES = 1024 * 1024;
export const PHOTO_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type UploadPhotoResult =
  { ok: true; url: string } | { ok: false; reason: "forbidden" | "too_large" | "unsupported" };

export function createAgents(supabase: HelpwrenSupabaseClient) {
  return {
    /**
     * Stores a photo for the signed-in team member and gives back its public address. Saving
     * that address on their profile is the server's job; this only stores the file.
     */
    async uploadPhoto(file: Blob): Promise<UploadPhotoResult> {
      const extension = (PHOTO_TYPES as Record<string, string | undefined>)[file.type];
      if (!extension) return { ok: false, reason: "unsupported" };
      if (file.size > PHOTO_MAX_BYTES) return { ok: false, reason: "too_large" };
      const { data: claims } = await supabase.auth.getClaims();
      if (!claims) return { ok: false, reason: "forbidden" };

      // A folder of their own, and a new name each time so a changed photo is never cached.
      const path = `${claims.claims.sub}/${crypto.randomUUID()}.${extension}`;
      const bucket = supabase.storage.from(PHOTO_BUCKET);
      const { error } = await bucket.upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (error) {
        // Storage reports a refusal by the access rules as a 403.
        if ("statusCode" in error && String(error.statusCode) === "403") {
          return { ok: false, reason: "forbidden" };
        }
        throw new HelpwrenError("Could not store the photo.", { cause: error });
      }
      return { ok: true, url: bucket.getPublicUrl(path).data.publicUrl };
    },

    /** Everyone on the team, by name. Only a signed-in, active team member gets any. */
    async list(): Promise<TeamMember[]> {
      const { data, error } = await supabase
        .from("agents")
        .select("id:user_id, name, email, role, active, photo")
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
        .select("id:user_id, name, email, role, photo")
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
