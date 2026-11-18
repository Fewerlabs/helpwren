import { EmptyState, type WrenScene } from "@helpwren/design-system";

export interface ComingSoonProps {
  /** The section's name, which is the page's main heading for assistive technology. */
  section: string;
  title: string;
  description: string;
  scene: WrenScene;
}

/** Stands in for a section that is planned and not built, so the dashboard shows its full shape. */
export function ComingSoon({ section, title, description, scene }: ComingSoonProps) {
  return (
    <div className="grid h-full place-items-center p-6">
      <h1 className="sr-only">{section}</h1>
      <EmptyState scene={scene} title={title} description={description} />
    </div>
  );
}
