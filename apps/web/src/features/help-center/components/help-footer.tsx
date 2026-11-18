import { type PublicSettings } from "@helpwren/core";

/**
 * The foot of every help center page: the brand's own links, and one quiet line saying what
 * runs it. The page is the customer's, so that line is as small as a credit can be.
 */
export function HelpFooter({
  settings,
  inert = false,
}: {
  settings: PublicSettings;
  inert?: boolean;
}) {
  const { brand, helpCenter } = settings;
  return (
    <footer inert={inert} className="border-rule mt-auto border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-6 text-sm sm:px-8">
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>
            © {new Date().getFullYear()} {brand.name}
          </span>
          {helpCenter.footerLinks.map((link) => (
            <a
              key={`${link.label}:${link.url}`}
              href={link.url}
              className="hover:text-foreground focus-visible:outline-ring rounded-sm underline-offset-4 hover:underline focus-visible:outline-2"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href="https://helpwren.fewerlabs.dev"
          rel="noopener"
          className="hover:text-foreground focus-visible:outline-ring rounded-sm text-xs focus-visible:outline-2"
        >
          Powered by Helpwren
        </a>
      </div>
    </footer>
  );
}
