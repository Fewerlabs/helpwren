import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Whether Glown's own logo, favicons and covers were copied into public/brand by
 * `scripts/copy-brand.mjs`. They are not in the repository; without them the example shows a
 * plain text logo.
 */
export const hasBrand = existsSync(join(process.cwd(), "public/brand/glown-full-dark.svg"));
