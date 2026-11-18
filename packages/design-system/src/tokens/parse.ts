export type ThemeName = "light" | "dark";
export type TokenValues = Readonly<Record<string, string>>;

const DECLARATION = /--(?<name>[\w-]+)\s*:\s*(?<value>[^;]+);/g;
const VAR = /^var\(\s*--(?<name>[\w-]+)\s*(?:,\s*(?<fallback>.+))?\)$/;

function declarations(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) {
    throw new Error(`No "${selector}" block found in the token stylesheet`);
  }
  const block = css.slice(start, css.indexOf("}", start));
  const entries: Record<string, string> = {};
  for (const match of block.matchAll(DECLARATION)) {
    const { name, value } = match.groups ?? {};
    if (name && value) {
      entries[name] = value.trim();
    }
  }
  return entries;
}

function resolve(value: string, raw: Record<string, string>, depth = 0): string {
  const groups = VAR.exec(value)?.groups;
  if (!groups?.name || depth > 10) {
    return value;
  }
  const next = raw[groups.name] ?? groups.fallback?.trim();
  if (next === undefined) {
    throw new Error(`Token "--${groups.name}" is referenced but never defined`);
  }
  return resolve(next, raw, depth + 1);
}

/**
 * Reads the token stylesheet and returns every custom property for a theme with
 * `var()` references resolved, so `background` comes back as a hex value.
 * Adopter override variables are unset here, so their fallbacks apply.
 */
export function parseTokens(css: string, theme: ThemeName): TokenValues {
  const raw = declarations(css, ":root");
  if (theme === "dark") {
    Object.assign(raw, declarations(css, ".dark"));
  }
  return Object.fromEntries(
    Object.entries(raw).map(([name, value]) => [name, resolve(value, raw)]),
  );
}
