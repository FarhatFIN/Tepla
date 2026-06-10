/**
 * OpenTelemetry Setup — Single-file init for all services
 *
 * MUST be imported BEFORE any other module:
 *   import './telemetry';  // first line of index.ts
 *
 * npm: @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
 *      @opentelemetry/exporter-prometheus @opentelemetry/exporter-trace-otlp-http
 *      @opentelemetry/api
 *
 * Provides:
 * - Distributed tracing (OTLP → Jaeger/Tempo)
 * - Prometheus metrics (pulled via /metrics endpoint)
 * - Trace context propagation through Kafka headers
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import {
  trace,
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  type Span,
  type Tracer,
} from '@opentelemetry/api';

const SERVICE_NAME = process.env.SERVICE_NAME || process.env.npm_package_name || 'unknown';
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const METRICS_PORT = parseInt(process.env.METRICS_PORT || '9464');

// ─── SDK Initialization ──────────────────────────

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '2.0.0',
  }),
  traceExporter: new OTLPTraceExporter({ url: `${OTEL_ENDPOINT}/v1/traces` }),
  metricReader: new PrometheusExporter({ port: METRICS_PORT }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => sdk.shutdown());

// ─── Exports ─────────────────────────────────────

export function getTracer(name?: string): Tracer {
  return trace.getTracer(name || SERVICE_NAME);
}

/**
 * Start a span for a critical path (message encrypt/send/deliver/decrypt).
 * Automatically sets error status on exception.
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  opts?: { kind?: SpanKind; attributes?: Record<string, string | number> }
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(
    name,
    { kind: opts?.kind || SpanKind.INTERNAL, attributes: opts?.attributes },
    async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
        span.recordException(err as Error);
        throw err;
      } finally {
        span.end();
      }
    }
  );
}

/**
 * Inject trace context into Kafka message headers.
 * Call when publishing Kafka events.
 */
export function injectTraceContext(headers: Record<string, string>): Record<string, string> {
  propagation.inject(context.active(), headers);
  return headers;
}

/**
 * Extract trace context from Kafka message headers.
 * Call in Kafka consumer before processing.
 */
export function extractTraceContext(headers: Record<string, string>): void {
  const ctx = propagation.extract(context.active(), headers);
  context.with(ctx, () => {});
}

// ─── Prometheus Metrics ──────────────────────────

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter(SERVICE_NAME);

/** E2E message latency: time from encrypt to decrypt ACK (ms) */
export const messageE2ELatency = meter.createHistogram('message_e2e_latency_ms', {
  description: 'End-to-end message latency from send to decrypt acknowledgment',
  unit: 'ms',
});

/** Double Ratchet step duration */
export const ratchetStepDuration = meter.createHistogram('ratchet_step_duration_ms', {
  description: 'Time to perform a Double Ratchet step (DH + KDF)',
  unit: 'ms',
});

/** Kafka consumer lag */
export const kafkaConsumerLag = meter.createObservableGauge('kafka_consumer_lag', {
  description: 'Kafka consumer lag per topic',
});

/** Failed decryptions — alert on sustained growth */
export const failedDecryptions = meter.createCounter('failed_decryptions_total', {
  description: 'Total number of failed message decryptions',
});

/** One-time prekey inventory — alert when < 5 */
export const prekeyRemaining = meter.createObservableGauge('prekey_bundle_remaining', {
  description: 'Number of available one-time prekeys per user',
});

/** Active WebSocket connections */
export const activeConnections = meter.createObservableGauge('ws_active_connections', {
  description: 'Current number of active WebSocket connections',
});

// ─── Structured Logging Standards ────────────────
// Enforced format for every log line. Used by createLogger.
//
// REQUIRED fields per line:
// {
//   "timestamp": "2025-01-15T10:30:00.123Z",
//   "level": "info|warn|error",
//   "service": "message-service",
//   "correlationId": "abc-123",   // propagated through all services
//   "message": "Human-readable description",
//   "data": { ... }               // structured payload
// }
//
// NEVER LOG:
// ❌ plaintext message content
// ❌ encryption keys, session keys, ratchet state
// ❌ PII: email, phone, IP (hash IP before logging)
// ❌ full request/response bodies
// ❌ JWT tokens or session tokens
// ❌ recovery phrases, passwords, OTP codes
//
// OK TO LOG:
// ✓ user_id (pseudonymous identifier)
// ✓ chat_id, message_id
// ✓ event types, durations, counts
// ✓ error messages (without stack traces in production)
// ✓ hashed IP (for rate limit debugging)
