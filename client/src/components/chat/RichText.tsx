"use client";
import { memo, useState, useCallback } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import sql from "highlight.js/lib/languages/sql";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);

function SpoilerSpan({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={() => setRevealed(true)}
      className={`cursor-pointer rounded px-0.5 transition-all duration-300 ${revealed ? "bg-transparent" : "bg-[var(--text-primary)] text-transparent select-none"}`}
    >
      {text}
    </span>
  );
}

function CodeBlock({ code, language, isOwn }: { code: string; language: string; isOwn: boolean }) {
  const [copied, setCopied] = useState(false);
  const lang = language.toLowerCase().trim();
  let highlighted: string;
  try {
    highlighted = lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value;
  } catch {
    highlighted = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="my-1 rounded-lg overflow-hidden bg-[#130D24] text-[#cdd6f4]">
      <div className="flex items-center justify-between px-3 py-1 bg-[#0D0818] text-xs">
        <span className="text-[#a6adc8]">{lang || "code"}</span>
        <button onClick={copy} className="text-[#a6adc8] hover:text-white transition-colors">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[13px] leading-relaxed"><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>
    </div>
  );
}

function InlineCode({ text }: { text: string }) {
  return <code className="rounded bg-[#130D24] text-[#cdd6f4] px-1.5 py-0.5 text-[13px] font-mono">{text}</code>;
}

interface RichTextProps {
  text: string;
  isOwn: boolean;
}

type Segment =
  | { type: "text"; value: string }
  | { type: "spoiler"; value: string }
  | { type: "code_block"; code: string; language: string }
  | { type: "inline_code"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string };

function parseRichText(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```|\|\|([\s\S]*?)\|\||`([^`\n]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    if (match[2] !== undefined) segments.push({ type: "code_block", code: match[2], language: match[1] || "" });
    else if (match[3] !== undefined) segments.push({ type: "spoiler", value: match[3] });
    else if (match[4] !== undefined) segments.push({ type: "inline_code", value: match[4] });
    else if (match[5] !== undefined) segments.push({ type: "bold", value: match[5] });
    else if (match[6] !== undefined) segments.push({ type: "bold", value: match[6] });
    else if (match[7] !== undefined) segments.push({ type: "italic", value: match[7] });
    else if (match[8] !== undefined) segments.push({ type: "italic", value: match[8] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ type: "text", value: text.slice(lastIndex) });
  return segments;
}

export default memo(function RichText({ text, isOwn }: RichTextProps) {
  const segments = parseRichText(text);
  if (segments.length === 1 && segments[0].type === "text") {
    return <span className="whitespace-pre-wrap break-words">{text}</span>;
  }
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case "text": return <span key={i} className="whitespace-pre-wrap break-words">{seg.value}</span>;
          case "spoiler": return <SpoilerSpan key={i} text={seg.value} />;
          case "code_block": return <CodeBlock key={i} code={seg.code} language={seg.language} isOwn={isOwn} />;
          case "inline_code": return <InlineCode key={i} text={seg.value} />;
          case "bold": return <strong key={i}>{seg.value}</strong>;
          case "italic": return <em key={i}>{seg.value}</em>;
          default: return null;
        }
      })}
    </>
  );
});
