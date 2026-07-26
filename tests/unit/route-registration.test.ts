import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve against this file, not process.cwd() — the suite may be launched
// from outside the repository root.
const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/**
 * Static guard against route shadowing (C-01).
 *
 * `auth.routes.ts` declared `GET /sessions` and `DELETE /sessions/:id` twice —
 * once ~600 lines above deriving identity from a spoofable `x-user-id` header,
 * once further down correctly behind `authMiddleware`. Express matches the
 * FIRST registration, so the insecure pair was live and the safe pair was
 * unreachable dead code that read as if the problem were already handled.
 *
 * Nothing about that is visible in review unless you happen to hold both ends
 * of a 1900-line file in your head, so it is worth asserting mechanically.
 */

const SERVICE_ROOTS = ['services', 'gateway', 'shared'];
const ROUTE_CALL = /^\s*(?:r|router|app|this\.app)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*(['"`])([^'"`]*)\2/gm;

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts') && !entry.includes('.test.')) acc.push(full);
  }
  return acc;
}

/** Normalise `:id` vs `:deviceId` — they occupy the same slot in the matcher. */
function normalizePath(path: string): string {
  return path.replace(/:[A-Za-z0-9_]+/g, ':param').replace(/\/+$/, '') || '/';
}

const files = SERVICE_ROOTS.flatMap((root) => {
  try {
    return sourceFiles(join(REPO_ROOT, root));
  } catch {
    return [];
  }
}).map((file) => file.replace(/\\/g, '/').replace(`${REPO_ROOT.replace(/\\/g, '/')}/`, ''));

function read(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), 'utf8');
}

describe('route registration', () => {
  it('finds route files to inspect', () => {
    // Guard against the sweep silently matching nothing and passing vacuously.
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files)('%s registers no duplicate method+path', (file) => {
    const source = read(file);
    const seen = new Map<string, number>();
    const duplicates: string[] = [];

    for (const match of source.matchAll(ROUTE_CALL)) {
      const key = `${match[1].toUpperCase()} ${normalizePath(match[3])}`;
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      if (count === 2) duplicates.push(key);
    }

    expect(duplicates, `shadowed routes in ${file} — only the first registration ever runs`).toEqual([]);
  });
});

describe('identity is never taken from a request header (C-01)', () => {
  // The auth service must derive the caller from the verified JWT. The
  // messaging service is the deliberate exception: it sits behind the gateway,
  // which strips any client-supplied x-user-id before setting its own (this is
  // documented in docs/AUDIT_TODO.md as a load-bearing assumption).
  const AUTH_SERVICE = 'services/auth-user-service';

  const authFiles = files.filter((file) => file.replace(/\\/g, '/').includes(AUTH_SERVICE));

  it('has auth-service files to inspect', () => {
    expect(authFiles.length).toBeGreaterThan(0);
  });

  it.each(authFiles)('%s does not read x-user-id as an identity', (file) => {
    const source = read(file);
    const offenders = source
      .split('\n')
      .map((line, index) => [index + 1, line] as const)
      .filter(([, line]) => /headers\s*\[\s*['"]x-user-id['"]\s*\]/i.test(line));

    expect(offenders.map(([line]) => line), `x-user-id used as identity in ${file}`).toEqual([]);
  });
});
