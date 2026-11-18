"use client";

import { type Agent } from "@helpwren/core";
import { type ReactNode } from "react";

import { HelpwrenProvider } from "@/lib/helpwren-context";

import { getDashboardClient } from "../client";
import { Sidebar } from "./sidebar";

export interface DashboardShellProps {
  agent: Agent;
  signOut: ReactNode;
  children: ReactNode;
}

/**
 * The frame around every dashboard page: the sidebar, and the Helpwren client for the signed-in
 * team member, which the sections share.
 */
export function DashboardShell({ agent, signOut, children }: DashboardShellProps) {
  return (
    <HelpwrenProvider getClient={getDashboardClient}>
      <div className="bg-background flex h-dvh max-md:flex-col">
        <Sidebar agent={agent} signOut={signOut} />
        <main className="min-h-0 min-w-0 flex-1">{children}</main>
      </div>
    </HelpwrenProvider>
  );
}
