/**
 * Request context via AsyncLocalStorage.
 * Propagates correlation ID, user ID, and timing through async call chains
 * without explicit parameter passing.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  correlationId: string;
  userId?: string;
  requestId: string;
  startTime: number;
  service: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/** Get current context (returns undefined outside a request) */
export function getContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/** Get correlation ID from context, or generate a fallback */
export function getCorrelationId(): string {
  return requestContext.getStore()?.correlationId || crypto.randomUUID();
}
