/**
 * Facts about the page in the form search engines read (schema.org, as JSON-LD). The data is
 * written as JSON, and `<` is escaped so that nothing in an article's title can end the script
 * element early and be read as markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
