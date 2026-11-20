import { articleFilterSchema } from "@helpwren/core";
import { z } from "zod";

import { answerWithArticles, articlesPreflight } from "@/lib/api/public-articles";

const METHODS = "POST";

const inputSchema = z.object({ filter: articleFilterSchema.default({}) });

export function OPTIONS(request: Request): Promise<Response> {
  return articlesPreflight(request, METHODS);
}

/**
 * The published articles a filter picks, for a filter too rich for an address:
 * `POST /api/articles/search { "filter": { ... } }`. The widget's inline lists use it.
 */
export async function POST(request: Request): Promise<Response> {
  const input = inputSchema.safeParse(await request.json().catch(() => null));
  return answerWithArticles(
    request,
    input.success ? { success: true, data: input.data.filter } : input,
    METHODS,
  );
}
