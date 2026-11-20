import { createFromSource } from "fumadocs-core/search/server";

import { docsSource } from "@/lib/docs-source";

// Written once at build: the browser downloads this index and searches it itself.
export const dynamic = "force-static";

export const { staticGET: GET } = createFromSource(docsSource, { language: "english" });
