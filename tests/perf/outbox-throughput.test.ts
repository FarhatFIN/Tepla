/**
 * Performance Test: Outbox Worker Throughput
 *
 * Tests:
 * 1. Insert 10,000 pending outbox events
 * 2. Measure time for outbox worker to process all
 * 3. Verify 0 events lost
 *
 * Run: npx tsx --tsconfig tsconfig.services.json tests/perf/outbox-throughput.test.ts
 * Requires: postgres, kafka running locally
 */
import { Pool } from 'pg';
import { uuidv7 } from 'uuidv7';

const EVENT_COUNT = 10_000;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log(`\n=== Outbox Throughput Test ===`);
  console.log(`Inserting ${EVENT_COUNT} pending outbox events...\n`);

  // 1. Insert events in batches of 500
  const insertStart = performance.now();
  const BATCH = 500;

  for (let i = 0; i < EVENT_COUNT; i += BATCH) {
    const count = Math.min(BATCH, EVENT_COUNT - i);
    const values: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (let j = 0; j < count; j++) {
      const id = uuidv7();
      values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}::jsonb, 'pending', $${idx + 6})`);
      params.push(
        id, 'message', id,
        'tepla.message.events.test', 'tepla.message.events',
        JSON.stringify({ test: true, messageId: id, chatId: 'perf-test' }),
        `perf-test-${i + j}`
      );
      idx += 7;
    }

    await pool.query(
      `INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, topic, payload, status, correlation_id) VALUES ${values.join(', ')}`,
      params
    );
  }

  const insertDuration = performance.now() - insertStart;
  console.log(`Insert: ${EVENT_COUNT} events in ${insertDuration.toFixed(0)}ms (${(EVENT_COUNT / insertDuration * 1000).toFixed(0)} events/sec)`);

  // 2. Wait for outbox worker to process
  console.log(`\nWaiting for outbox worker to process events...`);
  console.log(`(Make sure the outbox worker is running)`);

  const processStart = performance.now();
  let lastPending = EVENT_COUNT;
  let checkCount = 0;

  while (true) {
    const res = await pool.query(`SELECT COUNT(*) as count FROM outbox WHERE status = 'pending' AND correlation_id LIKE 'perf-test-%'`);
    const pending = parseInt(res.rows[0].count, 10);

    if (pending !== lastPending) {
      const processed = EVENT_COUNT - pending;
      const elapsed = performance.now() - processStart;
      const rate = (processed / elapsed * 1000).toFixed(0);
      console.log(`  Processed: ${processed}/${EVENT_COUNT} (${rate} events/sec, pending: ${pending})`);
      lastPending = pending;
    }

    if (pending === 0) break;

    checkCount++;
    if (checkCount > 600) { // 60 seconds timeout
      console.error(`\n❌ TIMEOUT: ${pending} events still pending after 60s`);
      break;
    }

    await new Promise(r => setTimeout(r, 100));
  }

  const processDuration = performance.now() - processStart;

  // 3. Check results
  const processed = await pool.query(`SELECT COUNT(*) as count FROM outbox WHERE status = 'processed' AND correlation_id LIKE 'perf-test-%'`);
  const dead = await pool.query(`SELECT COUNT(*) as count FROM outbox WHERE status = 'dead' AND correlation_id LIKE 'perf-test-%'`);
  const processedCount = parseInt(processed.rows[0].count, 10);
  const deadCount = parseInt(dead.rows[0].count, 10);

  console.log(`\n--- Results ---`);
  console.log(`Total events: ${EVENT_COUNT}`);
  console.log(`Processed: ${processedCount}`);
  console.log(`Dead (DLQ): ${deadCount}`);
  console.log(`Lost: ${EVENT_COUNT - processedCount - deadCount}`);
  console.log(`Processing time: ${processDuration.toFixed(0)}ms`);
  console.log(`Throughput: ${(processedCount / processDuration * 1000).toFixed(0)} events/sec`);

  // Cleanup test data
  await pool.query(`DELETE FROM outbox WHERE correlation_id LIKE 'perf-test-%'`);
  console.log(`\nCleaned up test data.`);

  if (processedCount + deadCount < EVENT_COUNT) {
    console.error(`\n❌ FAIL: ${EVENT_COUNT - processedCount - deadCount} events lost!`);
    process.exit(1);
  }

  console.log(`\n✅ PASS: Zero events lost`);
  await pool.end();
}

main().catch(console.error);
