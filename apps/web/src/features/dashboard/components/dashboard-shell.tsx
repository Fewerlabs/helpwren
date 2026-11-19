"use client";

import { type Agent } from "@helpwren/core";
import { cn, compactControls, ConfirmProvider, Toaster } from "@helpwren/design-system";
import { type ReactNode } from "react";

import { Notifier } from "@/features/notifications";
import { HelpwrenProvider } from "@/lib/helpwren-context";

import { getDashboardClient } from "../client";
import { Sidebar } from "./sidebar";

export interface DashboardShellProps {
  agent: Agent;
  signOut: ReactNode;
  children: ReactNode;
}

/**
 * The frame around every dashboard page: the sidebar, the Helpwren client for the signed-in
 * team member, and the one confirmation dialog and stack of toasts, all of which the sections
 * share.
 */
export function DashboardShell({ agent, signOut, children }: DashboardShellProps) {
  return (
    <HelpwrenProvider getClient={getDashboardClient}>
      <ConfirmProvider>
        {/* A lighter canvas than the page colour, so the white panels sit on it quietly. */}
        <div
          className={cn(
            "bg-canvas flex h-dvh text-[0.8125rem] leading-5 max-md:flex-col",
            // A dashboard is used with a mouse and keyboard, all day: everything is a size down.
            compactControls,
          )}
        >
          <Notifier agentId={agent.id} />
          <Sidebar agent={agent} signOut={signOut} />
          <main className="min-h-0 min-w-0 flex-1">{children}</main>
          {/* At the top: the bottom corners hold the reply box's Send button and the sidebar. */}
          <Toaster position="top-center" />
        </div>
      </ConfirmProvider>
    </HelpwrenProvider>
  );
}
