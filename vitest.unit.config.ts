import { defineConfig } from 'vitest/config';

/**
 * Unit suite for the audit fixes.
 *
 * Deliberately separate from `vitest.config.ts` (which targets the legacy
 * root `src/` tree). Everything under `tests/unit` is chosen to be runnable
 * with **no infrastructure**: no Postgres, no Redis, no Kafka, no S3. That is
 * why several helpers were extracted out of the big route files during this
 * pass — logic that cannot be imported without booting a service cannot be
 * tested.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    globals: false,
    // Each file mutates process.env (PUSH_*, TRUST_PROXY); keep files isolated.
    isolate: true,
  },
});
