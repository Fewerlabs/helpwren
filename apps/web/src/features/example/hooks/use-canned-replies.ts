import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCannedReply } from "../api/canned-replies";
import type { NewCannedReply } from "../schemas/canned-reply";

/** Cache keys for this feature, in one place so reads and invalidations cannot drift apart. */
export const cannedReplyKeys = {
  all: ["canned-replies"] as const,
  list: (search: string) => [...cannedReplyKeys.all, "list", { search }] as const,
};

/** Creates a canned reply, then refreshes every list that could contain it. */
export function useCreateCannedReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: NewCannedReply) => createCannedReply(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cannedReplyKeys.all }),
  });
}
