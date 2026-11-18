import type { ComponentProps } from "react";

import { Skeleton as UiSkeleton } from "#components/ui/skeleton";

export type SkeletonProps = ComponentProps<"div">;

/**
 * A placeholder in the shape of content that is loading. It is hidden from
 * assistive technology; announce loading once on the container instead.
 */
export function Skeleton(props: SkeletonProps) {
  return <UiSkeleton aria-hidden="true" {...props} />;
}
