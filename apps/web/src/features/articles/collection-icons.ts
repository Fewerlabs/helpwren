import { type IconName } from "@helpwren/design-system";

/** The icons a collection can wear, with a name for each to read out. */
export const collectionIcons = [
  { name: "book-open", label: "Book" },
  { name: "rocket-launch", label: "Rocket" },
  { name: "lightbulb", label: "Light bulb" },
  { name: "gear", label: "Gear" },
  { name: "wrench", label: "Wrench" },
  { name: "credit-card", label: "Card" },
  { name: "user", label: "Person" },
  { name: "users", label: "People" },
  { name: "lock", label: "Padlock" },
  { name: "shield-check", label: "Shield" },
  { name: "key", label: "Key" },
  { name: "chat-circle", label: "Speech bubble" },
  { name: "envelope", label: "Envelope" },
  { name: "bell", label: "Bell" },
  { name: "calendar", label: "Calendar" },
  { name: "package", label: "Parcel" },
  { name: "chart-bar", label: "Chart" },
  { name: "lightning", label: "Lightning" },
  { name: "puzzle-piece", label: "Puzzle piece" },
  { name: "code", label: "Code" },
  { name: "device-mobile", label: "Phone" },
  { name: "globe", label: "Globe" },
  { name: "graduation-cap", label: "Graduation cap" },
  { name: "megaphone", label: "Megaphone" },
  { name: "lifebuoy", label: "Lifebuoy" },
  { name: "heart", label: "Heart" },
  { name: "star", label: "Star" },
  { name: "question", label: "Question mark" },
] as const satisfies readonly { name: IconName; label: string }[];

const names: readonly string[] = collectionIcons.map((icon) => icon.name);

/** A collection's icon, or the book when it names one this version does not have. */
export function collectionIcon(name: string): IconName {
  return names.includes(name) ? (name as IconName) : "book-open";
}
