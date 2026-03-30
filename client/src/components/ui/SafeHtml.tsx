"use client";

import { type HTMLAttributes, memo, useMemo } from "react";

import { sanitizeHtml } from "@/lib/security/sanitizeHtml";

type SafeHtmlTag = "code" | "div" | "pre" | "span";

type SafeHtmlProps = Omit<HTMLAttributes<HTMLElement>, "children" | "dangerouslySetInnerHTML"> & {
  as?: SafeHtmlTag;
  html: string;
};

function SafeHtmlComponent({ as: Tag = "div", html, ...props }: SafeHtmlProps) {
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  return (
    // SECURITY: centralize raw HTML rendering so every sink passes through sanitizeHtml().
    // eslint-disable-next-line react/no-danger
    <Tag {...props} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
  );
}

const SafeHtml = memo(SafeHtmlComponent);

export default SafeHtml;
