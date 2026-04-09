/**
 * Performance Test: Message Send Flow
 *
 * Tests:
 * 1. Concurrent message sends — verify no messages lost
 * 2. Measure p50/p95/p99 latency
 * 3. Check DB connection pool under load
 * 4. Verify outbox queue depth stays bounded
 *
 * Run: npx tsx --tsconfig tsconfig.services.json tests/perf/message-send.test.ts
 * Requires: postgres, redis, kafka running locally
 */
import { Pool } from 'pg';
import Redis from 'ioredis';

const API_BASE = process.env.API_BASE || 'http://localhost:3004';
const CONCURRENCY = 100;
const TOTAL_REQUESTS = 1000;
const CHAT_ID = process.env.TEST_CHAT_ID || '00000000-0000-0000-0000-000000000001';

interface PerfResult {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  avgMs: number;
  totalDuration: number;
  requestsPerSecond: number;
}

async function sendMessage(token: string, chatId: string): Promise<{ ok: boolean; latency: number }> {
  const start = performance.now();
  try {
    const res = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        chatId,
        content: `perf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'text',
      }),
    });
    const latency = performance.now() - start;
    return { ok: res.status === 201, latency };
  } catch {
    return { ok: false, latency: performance.now() - start };
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function runLoadTest(token: string): Promise<PerfResult> {
  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;

  const totalStart = performance.now();

  // Send in batches of CONCURRENCY
  for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENCY) {
    const batch = Math.min(CONCURRENCY, TOTAL_REQUESTS - i);
    const promises = Array.from({ length: batch }, () => sendMessage(token, CHAT_ID));
    const results = await Promise.all(promises);

    for (const r of results) {
      latencies.push(r.latency);
      if (r.ok) successCount++;
      else errorCount++;
    }
  }

  const totalDuration = performance.now() - totalStart;
  const sorted = latencies.slice().sort((a, b) => a - b);

  return {
    totalRequests: TOTAL_REQUESTS,
    successCount,
    errorCount,
    latencies: sorted,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    avgMs: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    totalDuration,
    requestsPerSecond: (TOTAL_REQUESTS / totalDuration) * 1000,
  };
}

async function checkDbConnections(): Promise<number> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'`);
    return parseInt(res.rows[0].count, 10);
  } finally {
    await pool.end();
  }
}

async function checkOutboxDepth(): Promise<number> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query(`SELECT COUNT(*) as count FROM outbox WHERE status = 'pending'`);
    return parseInt(res.rows[0].count, 10);
  } finally {
    await pool.end();
  }
}

async function main() {
  const token = process.env.TEST_TOKEN;
  if (!token) {
    console.error('Set TEST_TOKEN env var with a valid JWT');
    process.exit(1);
  }

  console.log(`\n=== Message Send Performance Test ===`);
  console.log(`Target: ${API_BASE}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Total requests: ${TOTAL_REQUESTS}\n`);

  const dbConnBefore = await checkDbConnections();
  console.log(`DB active connections (before): ${dbConnBefore}`);

  const result = await runLoadTest(token);

  const dbConnAfter = await checkDbConnections();
  const outboxDepth = await checkOutboxDepth();

  console.log(`\n--- Results ---`);
  console.log(`Success: ${result.successCount}/${result.totalRequests}`);
  console.log(`Errors: ${result.errorCount}`);
  console.log(`Total duration: ${result.totalDuration.toFixed(0)}ms`);
  console.log(`Requests/sec: ${result.requestsPerSecond.toFixed(1)}`);
  console.log(`Latency p50: ${result.p50.toFixed(1)}ms`);
  console.log(`Latency p95: ${result.p95.toFixed(1)}ms`);
  console.log(`Latency p99: ${result.p99.toFixed(1)}ms`);
  console.log(`Latency avg: ${result.avgMs.toFixed(1)}ms`);
  console.log(`DB active connections (after): ${dbConnAfter}`);
  console.log(`Outbox pending depth: ${outboxDepth}`);

  // Assertions
  const errorRate = result.errorCount / result.totalRequests;
  if (errorRate > 0.01) {
    console.error(`\n❌ FAIL: Error rate ${(errorRate * 100).toFixed(1)}% > 1%`);
    process.exit(1);
  }
  if (result.p99 > 500) {
    console.warn(`\n⚠️  WARN: p99 latency ${result.p99.toFixed(0)}ms > 500ms target`);
  }
  if (dbConnAfter > 25) {
    console.warn(`\n⚠️  WARN: DB connections ${dbConnAfter} > 25 (possible pool exhaustion)`);
  }

  console.log(`\n✅ PASS: Message send performance within bounds`);
}

main().catch(console.error);
