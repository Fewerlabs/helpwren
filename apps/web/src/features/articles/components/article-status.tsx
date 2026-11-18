import { type ArticleStatus } from "@helpwren/core";
import { StatusChip } from "@helpwren/design-system";

/** Whether an article is public yet. The word carries it; the colour only helps. */
export function ArticleStatusChip({ status }: { status: ArticleStatus }) {
  return status === "published" ? (
    <StatusChip status="resolved" size="sm">
      Published
    </StatusChip>
  ) : (
    <StatusChip status="closed" size="sm">
      Draft
    </StatusChip>
  );
}
