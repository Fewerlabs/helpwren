import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { TooltipProvider } from "../base/tooltip/tooltip";

/**
 * A fresh cache per test or story, with retries off so errors show at once. The page footer's
 * buttons have tooltips, which need a provider the app would place at its root.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
}
