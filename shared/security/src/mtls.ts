/**
 * mTLS + Service Identity for Zero Trust inter-service communication
 *
 * Each service has:
 *   - A TLS certificate signed by the internal CA
 *   - A service identity (SPIFFE-like): spiffe://tepla.local/<service-name>
 *   - A list of allowed callers per endpoint
 *
 * Certificate generation (run once, store in Vault or K8s secrets):
 *
 *   # Generate CA
 *   openssl ecparam -genkey -name prime256v1 -out ca.key
 *   openssl req -new -x509 -key ca.key -out ca.crt -days 3650 \
 *     -subj "/CN=tepla-internal-ca"
 *
 *   # Generate service cert (repeat per service)
 *   openssl ecparam -genkey -name prime256v1 -out message-service.key
 *   openssl req -new -key message-service.key -out message-service.csr \
 *     -subj "/CN=message-service" \
 *     -addext "subjectAltName=DNS:message-service,URI:spiffe://tepla.local/message-service"
 *   openssl x509 -req -in message-service.csr -CA ca.crt -CAkey ca.key \
 *     -CAcreateserial -out message-service.crt -days 365 \
 *     -extfile <(printf "subjectAltName=DNS:message-service,URI:spiffe://tepla.local/message-service")
 *
 * npm: built-in (node:tls, node:https, node:fs)
 */

import https from 'https';
import tls from 'tls';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@tepla/common';

const logger = createLogger('mtls');

export interface MTLSConfig {
  caPath: string;         // CA certificate path
  certPath: string;       // This service's certificate
  keyPath: string;        // This service's private key
  serviceName: string;    // This service's identity
}

/**
 * Create HTTPS server options with mutual TLS.
 * Requires client certificates signed by the same CA.
 */
export function createMTLSOptions(config: MTLSConfig): https.ServerOptions {
  return {
    ca: fs.readFileSync(config.caPath),
    cert: fs.readFileSync(config.certPath),
    key: fs.readFileSync(config.keyPath),
    requestCert: true,           // require client cert
    rejectUnauthorized: true,    // reject invalid/unsigned certs
    minVersion: 'TLSv1.3' as tls.SecureVersion,
  };
}

/**
 * Extract service identity from client certificate.
 * Returns SPIFFE URI or CN from the peer certificate.
 */
export function extractServiceIdentity(req: Request): string | null {
  const cert = (req.socket as tls.TLSSocket).getPeerCertificate?.();
  if (!cert || !cert.subject) return null;

  // Check for SPIFFE URI in SAN
  const san = cert.subjectaltname;
  if (san) {
    const spiffeMatch = san.match(/URI:spiffe:\/\/tepla\.local\/([a-z-]+)/);
    if (spiffeMatch) return spiffeMatch[1];
  }

  // Fallback to CN
  return cert.subject.CN || null;
}

/**
 * Middleware: validate that the calling service is in the allowed list.
 *
 * Usage:
 *   router.post('/internal/decrypt',
 *     validateServiceIdentity(['message-service', 'chat-service']),
 *     handler
 *   );
 */
export function validateServiceIdentity(
  allowedServices: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const identity = extractServiceIdentity(req);

    if (!identity) {
      logger.warn('Request without service identity', { ip: req.ip });
      return res.status(401).json({ error: 'Client certificate required' });
    }

    if (!allowedServices.includes(identity)) {
      logger.warn('Unauthorized service call', {
        caller: identity,
        allowed: allowedServices,
        path: req.path,
      });
      return res.status(403).json({ error: `Service '${identity}' is not authorized for this endpoint` });
    }

    // Attach identity to request for downstream use
    (req as any).serviceIdentity = identity;
    next();
  };
}

// ─── Service Permissions Map ─────────────────────
// Central definition of which service can call which endpoint.
// Enforced by validateServiceIdentity middleware.

export const SERVICE_PERMISSIONS: Record<string, string[]> = {
  'message-service': [
    'auth-service',        // validate tokens
    'user-service',        // fetch user profiles
    'media-service',       // upload attachments
  ],
  'auth-service': [
    'user-service',        // create/lookup users
  ],
  'websocket-gateway': [
    'message-service',     // Kafka already handles this, but for HTTP fallback
    'presence-service',
  ],
  'notification-service': [
    'message-service',     // receive message events
    'user-service',        // fetch push tokens
  ],
};
