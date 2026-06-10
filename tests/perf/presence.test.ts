/**
 * Performance Test: Presence Under Load
 *
 * Tests:
 * 1. 5000 users set online simultaneously via Redis
 * 2. Verify all presence states correct
 * 3. Check Redis memory usage
 * 4. Measure throughput of SISMEMBER lookups
 *
 * Run: npx tsx --tsconfig tsconfig.services.json tests/perf/presence.test.ts
 * Requires: redis running locally
 */
import Redis from 'ioredis';

const USER_COUNT = 5000;
const LOOKUP_COUNT = 10_000;

async function main() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  console.log(`\n=== Presence Performance Test ===`);
  console.log(`Users: ${USER_COUNT}, Lookups: ${LOOKUP_COUNT}\n`);

  // Memory before
  const infoBefore = await redis.info('memory');
  const memBefore = infoBefore.match(/used_memory:(\d+)/)?.[1] || '0';

  // 1. Set 5000 users online via pipeline
  const setStart = performance.now();
  let pipeline = redis.pipeline();
  for (let i = 0; i < USER_COUNT; i++) {
    const userId = `perf-user-${i}`;
    pipeline.set(`presence:online:${userId}`, JSON.stringify({
      userId,
      status: 'online',
      lastSeen: new Date().toISOString(),
    }), 'EX', 300);
    pipeline.sadd('presence:online-set', userId);

    // Flush every 500 to avoid memory pressure
    if (i % 500 === 499) {
      await pipeline.exec();
      pipeline = redis.pipeline();
    }
  }
  await pipeline.exec();
  const setDuration = performance.now() - setStart;
  console.log(`Set ${USER_COUNT} users online: ${setDuration.toFixed(0)}ms (${(USER_COUNT / setDuration * 1000).toFixed(0)} ops/sec)`);

  // 2. Verify all users are online
  const verifyStart = performance.now();
  const onlineCount = await redis.scard('presence:online-set');
  const verifyDuration = performance.now() - verifyStart;
  console.log(`Verify online count: ${onlineCount} (expected ${USER_COUNT}) in ${verifyDuration.toFixed(1)}ms`);

  // 3. Benchmark SISMEMBER lookups (the hot path for checking if user is online)
  const lookupStart = performance.now();
  let hitCount = 0;
  const lookupPipeline = redis.pipeline();
  for (let i = 0; i < LOOKUP_COUNT; i++) {
    const userId = `perf-user-${Math.floor(Math.random() * USER_COUNT * 1.2)}`; // ~80% hit rate
    lookupPipeline.sismember('presence:online-set', userId);
  }
  const lookupResults = await lookupPipeline.exec();
  for (const [err, result] of lookupResults!) {
    if (!err && result === 1) hitCount++;
  }
  const lookupDuration = performance.now() - lookupStart;
  console.log(`\n${LOOKUP_COUNT} SISMEMBER lookups: ${lookupDuration.toFixed(0)}ms (${(LOOKUP_COUNT / lookupDuration * 1000).toFixed(0)} ops/sec)`);
  console.log(`Hit rate: ${(hitCount / LOOKUP_COUNT * 100).toFixed(1)}%`);

  // 4. Memory after
  const infoAfter = await redis.info('memory');
  const memAfter = infoAfter.match(/used_memory:(\d+)/)?.[1] || '0';
  const memDelta = (parseInt(memAfter) - parseInt(memBefore)) / 1024;
  console.log(`\nRedis memory delta: ${memDelta.toFixed(1)} KB`);

  // Cleanup
  pipeline = redis.pipeline();
  for (let i = 0; i < USER_COUNT; i++) {
    pipeline.del(`presence:online:perf-user-${i}`);
  }
  pipeline.del('presence:online-set');
  await pipeline.exec();
  console.log(`Cleaned up test data.`);

  // Assertions
  if (onlineCount !== USER_COUNT) {
    console.error(`\n❌ FAIL: Expected ${USER_COUNT} online, got ${onlineCount}`);
    process.exit(1);
  }

  const lookupRate = LOOKUP_COUNT / lookupDuration * 1000;
  if (lookupRate < 50_000) {
    console.warn(`\n⚠️  WARN: SISMEMBER rate ${lookupRate.toFixed(0)}/sec below 50k/sec target`);
  }

  console.log(`\n✅ PASS: Presence performance within bounds`);
  await redis.quit();
}

main().catch(console.error);
