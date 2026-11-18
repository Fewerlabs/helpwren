"use client";

import { type HelpwrenClient } from "@helpwren/core";
import { createContext, useContext, type ReactNode } from "react";

type GetClient = () => HelpwrenClient;

const HelpwrenContext = createContext<GetClient | null>(null);

export interface HelpwrenProviderProps {
  /**
   * Returns the client library for whoever is using this screen. It is a function, not a
   * client, so that nothing is created while rendering on the server: components call it only
   * from effects, event handlers and query functions.
   */
  getClient: GetClient;
  children: ReactNode;
}

/** Gives the screens below it their Helpwren client: the visitor's in the chat, an agent's in the inbox. */
export function HelpwrenProvider({ getClient, children }: HelpwrenProviderProps) {
  return <HelpwrenContext value={getClient}>{children}</HelpwrenContext>;
}

/** The function that returns this screen's Helpwren client. Call the result, not while rendering. */
export function useHelpwren(): GetClient {
  const getClient = useContext(HelpwrenContext);
  if (!getClient) throw new Error("useHelpwren needs a HelpwrenProvider above it.");
  return getClient;
}
