const units = ["B", "KB", "MB", "GB"] as const;

/** A file's size as a person would say it: `812 B`, `34 KB`, `2.4 MB`. */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit] ?? "B"}`;
}
