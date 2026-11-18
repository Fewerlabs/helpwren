import Link from "next/link";

const sections = [
  { href: "/embed", label: "Embed" },
  { href: "/help", label: "Help center" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/design", label: "Design system" },
] as const;

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Helpwren</h1>
      <p className="text-muted-foreground mt-2">Pre-alpha. These routes are placeholders.</p>
      <ul className="mt-4 list-disc pl-6">
        {sections.map((section) => (
          <li key={section.href}>
            <Link className="text-biro underline" href={section.href}>
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
