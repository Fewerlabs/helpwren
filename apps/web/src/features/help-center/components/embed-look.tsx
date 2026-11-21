import { type HelpEmbed } from "@/lib/help-embed";

/**
 * The embedded help center's page, matched to the host's: behind the content, the colour it
 * asked for, nothing at all, or the help center's own card colour; and the host's theme in place
 * of the reader's choice, set before anything is drawn so it never flashes the other one.
 *
 * Both values were checked against fixed forms by `parseHelpEmbed`, so they are safe to write
 * into a style and a script.
 */
export function EmbedLook({ embed }: { embed: HelpEmbed }) {
  const background = embed.background ?? "var(--card)";
  return (
    <>
      <style>{`html,body{background-color:${background}}`}</style>
      {embed.theme ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.toggle("dark",${String(embed.theme === "dark")})`,
          }}
        />
      ) : null}
    </>
  );
}
