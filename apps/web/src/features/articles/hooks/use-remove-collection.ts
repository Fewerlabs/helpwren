import { type Collection } from "@helpwren/core";
import { toast, useConfirm } from "@helpwren/design-system";
import { useRouter } from "next/navigation";

import { useHelpwren } from "@/lib/helpwren-context";

import { HELP_PATH, useArticlesChanged } from "./use-articles";

/**
 * Deletes a collection once the person has agreed, and goes back to all the articles. The
 * articles in it are kept, as drafts in no collection. Resolves to whether it was deleted.
 */
export function useRemoveCollection() {
  const getClient = useHelpwren();
  const confirm = useConfirm();
  const changed = useArticlesChanged();
  const router = useRouter();

  return async function remove(collection: Collection): Promise<boolean> {
    const count = collection.articleCount;
    const confirmed = await confirm({
      title: `Delete ${collection.name}?`,
      description:
        count === 0
          ? "The collection is deleted for good."
          : count === 1
            ? "The collection is deleted for good. Its article is kept as a draft in no collection, and links to it stop working."
            : `The collection is deleted for good. Its ${count} articles are kept as drafts in no collection, and links to them stop working.`,
      confirmLabel: "Delete",
      tone: "destructive",
    });
    if (!confirmed) return false;
    try {
      const result = await getClient().collections.remove(collection.id, {
        releaseArticles: true,
      });
      if (!result.ok && result.reason === "not_empty") {
        toast.error("The collection could not be deleted. Try again.");
        return false;
      }
      await changed();
      router.push(HELP_PATH);
      toast.success("Collection deleted");
      return true;
    } catch {
      toast.error("The collection could not be deleted. Try again.");
      return false;
    }
  };
}
