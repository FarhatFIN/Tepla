import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "@/lib/security/sanitizeHtml";

describe("sanitizeHtml", () => {
  it("removes dangerous tags and event handlers from image payloads", () => {
    const dirtyHtml = '<img src="x" onerror="alert(1)" /><span class="hljs-keyword">const</span>';
    const sanitizedHtml = sanitizeHtml(dirtyHtml);

    expect(sanitizedHtml).not.toContain("<img");
    expect(sanitizedHtml).not.toContain("onerror");
    expect(sanitizedHtml).toContain('class="hljs-keyword"');
  });

  it("removes script tags and script contents", () => {
    const dirtyHtml = '<script>alert(1)</script><span class="hljs-string">safe</span>';
    const sanitizedHtml = sanitizeHtml(dirtyHtml);

    expect(sanitizedHtml).not.toContain("<script");
    expect(sanitizedHtml).not.toContain("alert(1)");
    expect(sanitizedHtml).toContain("safe");
  });

  it("preserves safe highlight.js markup", () => {
    const highlightedHtml = '<span class="hljs-keyword">const</span> value = 1;';

    expect(sanitizeHtml(highlightedHtml)).toBe(highlightedHtml);
  });
});
