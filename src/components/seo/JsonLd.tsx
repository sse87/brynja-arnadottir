/** Serialises JSON-LD for an inline script; `<` is escaped so data can never close the tag. */
export function jsonLdHtml(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />
  );
}
