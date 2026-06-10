/**
 * Secret chat session manager.
 *
 * Glues @tepla/crypto (X3DH + Double Ratchet) to the Tepla API
 * (/e2e/keys/*, /kt/*) and the encrypted key store. Ratchet state is
 * persisted after every encrypt/decrypt call.
 *
 * Identity key wire format (e2e_identity_keys.identity_key):
 * 128 hex chars = X25519 DH public key (64) || Ed25519 signing public key (64).
 * The Ed25519 half is also published to the Key Transparency log.
 */

import api from '../api';
import {
  generateIdentity,
  generateSignedPrekey,
  generateOneTimePrekeys,
  x3dhInitiate,
  x3dhRespond,
  initSender,
  initReceiver,
  ratchetEncrypt,
  ratchetDecrypt,
  computeSafetyNumber,
  verifyProof,
  type IdentityKeys,
  type SignedPrekey,
  type RatchetState,
  type EncryptedMessage,
  type MerkleProof,
} from '@tepla/crypto';
import { getSecret, putSecret, deleteSecret } from './keyStore';

const IDENTITY = 'identity';
const SIGNED_PREKEY = 'signedPrekey';
const OTP_SECRETS = 'oneTimePrekeySecrets';
const ratchetKey = (peerId: string) => `ratchet:${peerId}`;
const peerKey = (peerId: string) => `peer:${peerId}`;

const ONE_TIME_PREKEY_BATCH = 50;

/** Included in the first message of a secret chat so the peer can derive the session. */
export type SecretHandshake = {
  identityDhKey: string;
  identitySigningKey: string;
  ephemeralKey: string;
  signedPrekeyId: number;
  oneTimePrekeyId: number | null;
};

type ApiEnvelope<T> = { success: boolean; data: T };

type ServerBundle = {
  userId: string;
  identityKey: string;
  signedPrekey: string;
  signedPrekeySignature: string;
  signedPrekeyId: number;
  oneTimePrekey: string | null;
  oneTimePrekeyId: number | null;
};

function splitIdentityKey(packed: string): { dh: string; signing: string } {
  if (typeof packed !== 'string' || packed.length !== 128) {
    throw new Error('Unexpected identity key format');
  }
  return { dh: packed.slice(0, 64), signing: packed.slice(64) };
}

/**
 * Lazily create this device's identity, signed prekey and one-time prekeys,
 * upload them to the server and publish the signing key to the KT log.
 */
export async function ensureIdentity(): Promise<IdentityKeys> {
  const existing = await getSecret<IdentityKeys>(IDENTITY);
  if (existing) return existing;

  const identity = await generateIdentity();
  const signedPrekey = await generateSignedPrekey(identity, 1);
  const oneTime = generateOneTimePrekeys(ONE_TIME_PREKEY_BATCH);

  // Persist locally first — if an upload fails we can retry without losing keys.
  await putSecret(IDENTITY, identity);
  await putSecret(SIGNED_PREKEY, signedPrekey);
  await putSecret(
    OTP_SECRETS,
    Object.fromEntries(oneTime.map((p) => [String(p.keyId), p.keyPair.secretKey])),
  );

  await api.post('/e2e/keys/register', {
    identityKey: identity.dh.publicKey + identity.signing.publicKey,
    signedPrekey: signedPrekey.keyPair.publicKey,
    signedPrekeySignature: signedPrekey.signature,
    signedPrekeyId: signedPrekey.keyId,
  });
  await api.post('/e2e/keys/one-time', {
    prekeys: oneTime.map((p) => ({ keyId: p.keyId, prekey: p.keyPair.publicKey })),
  });
  await api.post('/kt/publish', { identityKeyHex: identity.signing.publicKey });

  return identity;
}

/** Verify the peer's signing key against the Key Transparency log (anti-MITM). */
async function verifyPeerKeyInKT(peerUserId: string, signingKeyHex: string): Promise<void> {
  const res = await api.get<ApiEnvelope<{ proof: MerkleProof; entry: { identityKeyHex: string } }>>(
    `/kt/proof/${peerUserId}`,
  );
  const { proof, entry } = res.data;
  if (entry.identityKeyHex !== signingKeyHex) {
    throw new Error('Identity key mismatch with Key Transparency log — possible MITM');
  }
  if (!verifyProof(proof)) {
    throw new Error('Invalid Key Transparency inclusion proof — possible MITM');
  }
}

/**
 * Initiate a secret chat with a peer (X3DH initiator side).
 * Returns the handshake to embed in the first message envelope.
 */
export async function startSession(peerUserId: string): Promise<SecretHandshake> {
  const identity = await ensureIdentity();
  const res = await api.get<ApiEnvelope<ServerBundle>>(`/e2e/keys/bundle/${peerUserId}`);
  const bundle = res.data;
  const peer = splitIdentityKey(bundle.identityKey);

  await verifyPeerKeyInKT(peerUserId, peer.signing);

  const init = await x3dhInitiate(identity, {
    identityDhKey: peer.dh,
    identitySigningKey: peer.signing,
    signedPrekey: bundle.signedPrekey,
    signedPrekeySignature: bundle.signedPrekeySignature,
    oneTimePrekey: bundle.oneTimePrekey,
  });

  await putSecret(ratchetKey(peerUserId), initSender(init.sharedSecret, bundle.signedPrekey));
  await putSecret(peerKey(peerUserId), { signingKey: peer.signing });

  return {
    identityDhKey: identity.dh.publicKey,
    identitySigningKey: identity.signing.publicKey,
    ephemeralKey: init.ephemeralPublicKey,
    signedPrekeyId: bundle.signedPrekeyId,
    oneTimePrekeyId: bundle.oneTimePrekeyId ?? null,
  };
}

/** Accept an incoming secret chat (X3DH responder side). */
export async function acceptSession(peerUserId: string, handshake: SecretHandshake): Promise<void> {
  const identity = await ensureIdentity();
  const signedPrekey = await getSecret<SignedPrekey>(SIGNED_PREKEY);
  if (!signedPrekey || signedPrekey.keyId !== handshake.signedPrekeyId) {
    throw new Error('Signed prekey not found for this handshake — keys may have been rotated');
  }

  let oneTimeSecret: string | null = null;
  if (handshake.oneTimePrekeyId !== null && handshake.oneTimePrekeyId !== undefined) {
    const secrets = (await getSecret<Record<string, string>>(OTP_SECRETS)) || {};
    oneTimeSecret = secrets[String(handshake.oneTimePrekeyId)] || null;
    if (!oneTimeSecret) throw new Error('One-time prekey secret not found on this device');
    delete secrets[String(handshake.oneTimePrekeyId)]; // single use
    await putSecret(OTP_SECRETS, secrets);
  }

  const sharedSecret = x3dhRespond(
    identity,
    signedPrekey.keyPair.secretKey,
    handshake.identityDhKey,
    handshake.ephemeralKey,
    oneTimeSecret,
  );

  await putSecret(ratchetKey(peerUserId), initReceiver(sharedSecret, signedPrekey.keyPair));
  await putSecret(peerKey(peerUserId), { signingKey: handshake.identitySigningKey });
}

export async function hasSession(peerUserId: string): Promise<boolean> {
  return (await getSecret<RatchetState>(ratchetKey(peerUserId))) !== null;
}

export async function encryptForPeer(peerUserId: string, plaintext: string): Promise<EncryptedMessage> {
  const state = await getSecret<RatchetState>(ratchetKey(peerUserId));
  if (!state) throw new Error('No secret chat session — call startSession/acceptSession first');
  const message = ratchetEncrypt(state, new TextEncoder().encode(plaintext));
  await putSecret(ratchetKey(peerUserId), state); // state was mutated — persist
  return message;
}

export async function decryptFromPeer(peerUserId: string, message: EncryptedMessage): Promise<string> {
  const state = await getSecret<RatchetState>(ratchetKey(peerUserId));
  if (!state) throw new Error('No secret chat session for this peer');
  const plaintext = ratchetDecrypt(state, message);
  await putSecret(ratchetKey(peerUserId), state);
  return new TextDecoder().decode(plaintext);
}

/** 60-digit safety number for manual verification (shown in chat info UI). */
export async function safetyNumberWith(peerUserId: string, localUserId: string): Promise<string> {
  const identity = await ensureIdentity();
  const peer = await getSecret<{ signingKey: string }>(peerKey(peerUserId));
  if (!peer) throw new Error('No secret chat session for this peer');
  return computeSafetyNumber(identity.signing.publicKey, localUserId, peer.signingKey, peerUserId);
}

/** Drop a session (peer key rotation, chat deletion). */
export async function endSession(peerUserId: string): Promise<void> {
  await deleteSecret(ratchetKey(peerUserId));
  await deleteSecret(peerKey(peerUserId));
}
