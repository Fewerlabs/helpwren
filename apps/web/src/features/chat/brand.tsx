"use client";

import { type Brand } from "@helpwren/core";
import { Avatar, Logo, type AvatarProps } from "@helpwren/design-system";
import { createContext, useContext, type ReactNode } from "react";

const BrandContext = createContext<Brand>({ name: "Helpwren" });

/** Makes the install's brand available to every screen of the chat. */
export function BrandProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  return <BrandContext value={brand}>{children}</BrandContext>;
}

export const useBrand = () => useContext(BrandContext);

/** The team's face beside its messages: the logo, or its initials. */
export function TeamAvatar(props: Omit<AvatarProps, "name" | "src">) {
  const brand = useBrand();
  return <Avatar name={brand.name} src={brand.logo} {...props} />;
}

/** The brand's mark at the top of a screen: its logo, or the wren when it has none. */
export function BrandMark({ size = 32 }: { size?: number }) {
  const brand = useBrand();
  if (!brand.logo) {
    return <Logo variant="mark" size={size} label={brand.name} />;
  }
  return (
    // A logo is any size and comes from the install's own storage, so it is a plain image.
    // eslint-disable-next-line @next/next/no-img-element -- the optimiser would need every install's storage host allowed
    <img
      src={brand.logo}
      alt={brand.name}
      height={size}
      style={{ height: size }}
      className="w-auto max-w-40 rounded-md object-contain"
    />
  );
}
