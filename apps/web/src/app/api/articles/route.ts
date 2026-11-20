import { parseArticleFilterParams } from "@helpwren/core";

import { answerWithArticles, articlesPreflight } from "@/lib/api/public-articles";

const METHODS = "GET";

export function OPTIONS(request: Request): Promise<Response> {
  return articlesPreflight(request, METHODS);
}

/**
 * The published articles a filter picks, for a host page that draws the list itself:
 * `GET /api/articles?collection=bookings&tags=refunds,cancellations&tag_mode=any&limit=5`.
 * See `parseArticleFilterParams` in @helpwren/core for every part.
 */
export function GET(request: Request): Promise<Response> {
  return answerWithArticles(
    request,
    parseArticleFilterParams(new URL(request.url).searchParams),
    METHODS,
  );
}
