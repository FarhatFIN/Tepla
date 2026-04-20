import assert from "node:assert/strict";

import { sanitizeHtml } from "../src/lib/security/sanitizeHtml.ts";

function runTest(name, fn) {
  fn();
  console.log(`PASS ${name}`);
}

runTest("sanitizeHtml removes dangerous tags and event handlers from image payloads", () => {
  const dirtyHtml = '<img src="x" onerror="alert(1)" /><span class="hljs-keyword">const</span>';
  const sanitizedHtml = sanitizeHtml(dirtyHtml);

  assert.doesNotMatch(sanitizedHtml, /<img/i);
  assert.doesNotMatch(sanitizedHtml, /onerror/i);
  assert.match(sanitizedHtml, /class="hljs-keyword"/i);
});

runTest("sanitizeHtml removes script tags and script contents", () => {
  const dirtyHtml = '<script>alert(1)</script><span class="hljs-string">safe</span>';
  const sanitizedHtml = sanitizeHtml(dirtyHtml);

  assert.doesNotMatch(sanitizedHtml, /<script/i);
  assert.doesNotMatch(sanitizedHtml, /alert\(1\)/i);
  assert.match(sanitizedHtml, /safe/i);
});

runTest("sanitizeHtml preserves safe highlight.js markup", () => {
  const highlightedHtml = '<span class="hljs-keyword">const</span> value = 1;';

  assert.equal(sanitizeHtml(highlightedHtml), highlightedHtml);
});

console.log("All sanitizeHtml tests passed.");
