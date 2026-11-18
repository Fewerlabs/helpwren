import { type ContactKind } from "@helpwren/core";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

/** The start of every contacts query's key, so one refresh reaches them all. */
export const CONTACTS_QUERY_KEY = ["contacts"] as const;

/** The segments of the contact list, in the order the navigation shows them. */
export const contactSegments = [
  { id: "everyone", label: "Everyone", icon: "users", kind: undefined },
  { id: "users", label: "Users", icon: "user", kind: "user" },
  { id: "guests", label: "Guests", icon: "globe", kind: "guest" },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: string;
  kind: ContactKind | undefined;
}[];

export type ContactSegment = (typeof contactSegments)[number];

export function useSegmentCounts(): Partial<Record<ContactSegment["id"], number>> {
  const getClient = useHelpwren();
  const counts = useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, "counts"],
    queryFn: () => getClient().contacts.countByKind(),
  });
  if (!counts.data) return {};
  const { guest, user } = counts.data;
  return { everyone: guest + user, users: user, guests: guest };
}

const SEGMENT = "show";
const SELECTED = "contact";

/** The segment in the address (`/dashboard/contacts?show=guests`). Everyone, unless it says otherwise. */
export function useContactSegment(): ContactSegment {
  const id = useSearchParams().get(SEGMENT);
  return contactSegments.find((segment) => segment.id === id) ?? contactSegments[0];
}

export function segmentHref(segment: ContactSegment): string {
  return segment.id === "everyone"
    ? "/dashboard/contacts"
    : `/dashboard/contacts?${SEGMENT}=${segment.id}`;
}

/** The open contact, kept in the address so a reload and a shared link land on the same person. */
export function useSelectedContact() {
  const selected = useSearchParams().get(SELECTED);

  const select = useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set(SELECTED, id);
    } else {
      url.searchParams.delete(SELECTED);
    }
    window.history.pushState(null, "", url);
  }, []);

  return [selected, select] as const;
}
