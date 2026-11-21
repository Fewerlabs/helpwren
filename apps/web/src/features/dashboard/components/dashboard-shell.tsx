"use client";

import { type Agent } from "@helpwren/core";
import { cn, compactControls, ConfirmProvider, Toaster } from "@helpwren/design-system";
import { type ReactNode } from "react";

import { Notifier } from "@/features/notifications";
import { InstallableApp } from "@/features/pwa";
import { HelpwrenProvider } from "@/lib/helpwren-context";

import { getDashboardClient } from "../client";
import { useTeamPresence } from "../hooks/use-team-presence";
import { Sidebar } from "./sidebar";

/** Shows the signed-in team member as online. Inside the provider, which it needs. */
function TeamPresence() {
  useTeamPresence();
  return null;
}

export interface DashboardShellProps {
  agent: Agent;
  signOut: ReactNode;
  /** Sections the install has switched off, left out of the sidebar. */
  hiddenSections?: readonly string[];
  children: ReactNode;
}

/**
 * The frame around every dashboard page: the sidebar, the Helpwren client for the signed-in
 * team member, and the one confirmation dialog and stack of toasts, all of which the sections
 * share.
 */
export function DashboardShell({ agent, signOut, hiddenSections, children }: DashboardShellProps) {
  return (
    <HelpwrenProvider getClient={getDashboardClient}>
      <ConfirmProvider>
        {/* A lighter canvas than the page colour, so the white panels sit on it quietly. */}
        <div
          className={cn(
            // Positioned and clipped, so nothing can scroll the app as a whole: a screen-reader
            // line (`sr-only`, absolutely placed) under a long page otherwise lands below the
            // viewport, since no scroll area is positioned, and stretches the document.
            "bg-canvas relative flex h-dvh overflow-clip text-[0.8125rem] leading-5 max-md:flex-col",
            // A dashboard is used with a mouse and keyboard, all day: everything is a size down.
            compactControls,
          )}
        >
          <Notifier agentId={agent.id} />
          <InstallableApp />
          <TeamPresence />
          <Sidebar
            agent={agent}
            signOut={signOut}
            {...(hiddenSections ? { hiddenSections } : {})}
          />
          <main className="min-h-0 min-w-0 flex-1">{children}</main>
          {/* At the top: the bottom corners hold the reply box's Send button and the sidebar. */}
          <Toaster position="top-center" />
        </div>
      </ConfirmProvider>
    </HelpwrenProvider>
  );
}
