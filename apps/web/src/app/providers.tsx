"use client";

import { TooltipProvider } from "@helpwren/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { RouteProgress } from "@/lib/route-progress";

/** How long fetched data counts as fresh before it is refetched in the background. */
const STALE_TIME_MS = 30_000;

/** The providers every route needs: the server-state cache and tooltips, and the bar that shows
 * a page loading. */
export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session, created once so the cache survives re-renders.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: STALE_TIME_MS } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouteProgress />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
