"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Shows its children everywhere but /docs. The docs scroll natively, with their own sidebar
 * and outline, so the home page's smooth scrolling stays off there.
 */
export function OutsideDocs({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname === "/docs" || pathname.startsWith("/docs/") ? null : children;
}
