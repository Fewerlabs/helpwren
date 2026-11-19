"use client";

import {
  Button,
  Icon,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@helpwren/design-system";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

/**
 * On a narrow screen, the list of every article: a button in the top bar that slides the list
 * in over the page. It scrolls on its own, however long it is, and never moves the page under
 * it. It closes when a link in it is followed.
 */
export function BrowseDrawer({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Following a link changes the address; the drawer has done its job and gets out of the way.
  const [openedAt, setOpenedAt] = useState(pathname);
  if (open && openedAt !== pathname) setOpen(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpenedAt(pathname);
        setOpen(next);
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Browse all articles"
          className="lg:hidden"
        >
          <Icon name="list" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" closeLabel="Close the list of articles" className="gap-0 p-0">
        <SheetHeader className="border-rule border-b px-5 py-4">
          <SheetTitle className="text-base">Browse all articles</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
