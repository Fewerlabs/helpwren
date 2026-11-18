import { EmptyState } from "@helpwren/design-system";
import type { Metadata } from "next";

import { accentStyle, brandFill } from "@/lib/accent";
import { getHelpwren } from "@/lib/helpwren";

export async function generateMetadata(): Promise<Metadata> {
  const helpwren = await getHelpwren();
  const { brand, helpCenter } = await helpwren.settings.getPublic();
  return { title: { absolute: helpCenter.title ?? `${brand.name} help center` } };
}

/** The public help center. It wears the install's brand; its articles are not built yet. */
export default async function HelpPage() {
  const helpwren = await getHelpwren();
  const { brand, helpCenter } = await helpwren.settings.getPublic();

  return (
    <main style={accentStyle(brand)}>
      <header
        className={
          brand.accent ? "text-primary-foreground px-6 py-16 text-center" : "px-6 py-16 text-center"
        }
        style={{ background: brandFill(brand) ?? "var(--muted)" }}
      >
        <p className="text-sm font-medium opacity-80">{brand.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {helpCenter.title ?? "How can we help?"}
        </h1>
        <p className="mx-auto mt-2 max-w-xl opacity-80">
          {helpCenter.intro ?? "Answers to common questions, written by our team."}
        </p>
      </header>
      {/* The book and pencil alone: the wren is our mark, and this page wears theirs. */}
      <EmptyState scene="first-article" bird={false} title="Articles are on their way" />
    </main>
  );
}
