"use client";

import { createContext, useContext, type ReactNode } from "react";

const AudienceContext = createContext<string | undefined>(undefined);

/** Makes the audience the page named, if it did, available to every screen of the chat. */
export function AudienceProvider({
  audience,
  children,
}: {
  audience: string | undefined;
  children: ReactNode;
}) {
  return <AudienceContext value={audience}>{children}</AudienceContext>;
}

/** Whose help articles the chat lists, besides those for everyone. Left out: every article. */
export const useAudience = () => useContext(AudienceContext);
