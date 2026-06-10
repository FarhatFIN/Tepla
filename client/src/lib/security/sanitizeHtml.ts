import DOMPurify from "isomorphic-dompurify";

const SAFE_HTML_TAGS = [
  "b",
  "br",
  "code",
  "em",
  "i",
  "mark",
  "pre",
  "s",
  "span",
  "strong",
  "u",
] as const;

const SAFE_HTML_ATTRS = ["class"] as const;

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...SAFE_HTML_TAGS],
    ALLOWED_ATTR: [...SAFE_HTML_ATTRS],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["iframe", "object", "embed", "link", "meta", "script", "style"],
    FORBID_ATTR: ["style"],
  });
}
