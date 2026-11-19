import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** `KEY=value` on one line. Comments and blank lines are kept as they are. */
const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

function unquote(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2 && (value.startsWith('"') || value.startsWith("'"))) {
    if (value.endsWith(value[0] ?? "")) return value.slice(1, -1);
  }
  return value;
}

/** The values set in an env file. A key with an empty value counts as not set. */
export function parseEnv(text: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = LINE.exec(line);
    if (match?.[1] === undefined) continue;
    const value = unquote(match[2] ?? "");
    if (value !== "") values.set(match[1], value);
  }
  return values;
}

/** Quotes a value only when a reader could take it the wrong way. */
function format(key: string, value: string): string {
  return /^[\w@%+=:,./-]*$/.test(value)
    ? `${key}=${value}`
    : `${key}="${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export interface MergeResult {
  text: string;
  /** Keys this merge wrote. */
  written: string[];
  /** Keys that already had a value and kept it. */
  kept: string[];
}

/**
 * Puts values into an env file's text. A key that already has a value keeps it unless
 * `overwrite` is set, so running the installer again never changes a working install by
 * surprise. `replace` names keys whose current value is a known placeholder, which are always
 * filled in. Comments, order and unrelated keys are left alone; new keys go at the end.
 */
export function mergeEnv(
  text: string,
  updates: Record<string, string>,
  {
    overwrite = false,
    replace = [],
    header,
  }: { overwrite?: boolean; replace?: readonly string[]; header?: string } = {},
): MergeResult {
  const existing = parseEnv(text);
  const written: string[] = [];
  const kept: string[] = [];
  const pending = new Map(Object.entries(updates));

  const lines = text === "" ? [] : text.replace(/\n$/, "").split("\n");
  const merged = lines.map((line) => {
    const key = LINE.exec(line)?.[1];
    if (key === undefined || !pending.has(key)) return line;
    const value = pending.get(key) ?? "";
    pending.delete(key);
    if (existing.has(key) && !overwrite && !replace.includes(key)) {
      kept.push(key);
      return line;
    }
    // An empty value and no value are the same to every reader.
    if ((existing.get(key) ?? "") === value) return line;
    written.push(key);
    return format(key, value);
  });

  const added = [...pending].map(([key, value]) => {
    written.push(key);
    return format(key, value);
  });
  if (added.length > 0) {
    if (merged.length > 0) merged.push("");
    if (header) merged.push(`# ${header}`);
    merged.push(...added);
  }
  return { text: `${merged.join("\n")}\n`, written, kept };
}

export function readEnvFile(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

/** Env files hold keys and passwords, so only the owner may read them. */
export function writeEnvFile(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, { mode: 0o600 });
  // `mode` applies only when the file is created; an existing file is tightened too.
  chmodSync(path, 0o600);
}
