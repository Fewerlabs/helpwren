import { z } from "zod";

/** The form for making or changing a collection. Empty text means none. */
export const collectionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the collection a name.")
    .max(80, "Keep the name under 80 characters."),
  description: z.string().trim().max(300, "Keep the description under 300 characters."),
  icon: z.string(),
});
export type CollectionFormValues = z.infer<typeof collectionFormSchema>;
