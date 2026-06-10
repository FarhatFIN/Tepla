/**
 * Unit tests for the secret chat crypto core: X3DH + Double Ratchet + safety numbers.
 * Run: npm run test (uses node:test via tsx)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import {
  generateIdentity,
  generateSignedPrekey,
  generateDHKeyPair,
  verifySignedPrekey,
  x3dhInitiate,
  x3dhRespond,
  initSender,
  initReceiver,
  ratchetEncrypt,
  ratchetDecrypt,
  computeSafetyNumber,
  type RatchetState,
} from '../index';

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

async function establishSessions(): Promise<{ alice: RatchetState; bob: RatchetState }> {
  const aliceId = await generateIdentity();
  const bobId = await generateIdentity();
  const bobSpk = await generateSignedPrekey(bobId, 1);
  const bobOpk = generateDHKeyPair();

  const init = await x3dhInitiate(aliceId, {
    identityDhKey: bobId.dh.publicKey,
    identitySigningKey: bobId.signing.publicKey,
    signedPrekey: bobSpk.keyPair.publicKey,
    signedPrekeySignature: bobSpk.signature,
    oneTimePrekey: bobOpk.publicKey,
  });

  const bobSecret = x3dhRespond(
    bobId,
    bobSpk.keyPair.secretKey,
    aliceId.dh.publicKey,
    init.ephemeralPublicKey,
    bobOpk.secretKey
  );

  assert.deepEqual(init.sharedSecret, bobSecret, 'X3DH must yield identical shared secrets');

  return {
    alice: initSender(init.sharedSecret, bobSpk.keyPair.publicKey),
    bob: initReceiver(bobSecret, bobSpk.keyPair),
  };
}

test('X3DH produces the same shared secret on both sides', async () => {
  await establishSessions(); // asserts internally
});

test('x3dhInitiate rejects a tampered signed prekey (MITM)', async () => {
  const aliceId = await generateIdentity();
  const bobId = await generateIdentity();
  const bobSpk = await generateSignedPrekey(bobId, 1);
  const attacker = generateDHKeyPair(); // server substitutes its own prekey

  assert.equal(
    await verifySignedPrekey(attacker.publicKey, bobSpk.signature, bobId.signing.publicKey),
    false
  );
  await assert.rejects(
    x3dhInitiate(aliceId, {
      identityDhKey: bobId.dh.publicKey,
      identitySigningKey: bobId.signing.publicKey,
      signedPrekey: attacker.publicKey,
      signedPrekeySignature: bobSpk.signature,
    }),
    /MITM/
  );
});

test('double ratchet ping-pong round trip', async () => {
  const { alice, bob } = await establishSessions();

  for (const text of ['привет', 'second', 'third']) {
    const msg = ratchetEncrypt(alice, utf8ToBytes(text));
    assert.equal(decode(ratchetDecrypt(bob, msg)), text);
  }

  // Bob replies — triggers a DH ratchet step on both sides.
  for (const text of ['reply 1', 'reply 2']) {
    const msg = ratchetEncrypt(bob, utf8ToBytes(text));
    assert.equal(decode(ratchetDecrypt(alice, msg)), text);
  }

  // And back again — second DH ratchet step.
  const last = ratchetEncrypt(alice, utf8ToBytes('after ratchet'));
  assert.equal(decode(ratchetDecrypt(bob, last)), 'after ratchet');
});

test('out-of-order delivery within a chain', async () => {
  const { alice, bob } = await establishSessions();

  const m0 = ratchetEncrypt(alice, utf8ToBytes('msg 0'));
  const m1 = ratchetEncrypt(alice, utf8ToBytes('msg 1'));
  const m2 = ratchetEncrypt(alice, utf8ToBytes('msg 2'));

  assert.equal(decode(ratchetDecrypt(bob, m2)), 'msg 2');
  assert.equal(decode(ratchetDecrypt(bob, m0)), 'msg 0');
  assert.equal(decode(ratchetDecrypt(bob, m1)), 'msg 1');
});

test('replayed message is rejected', async () => {
  const { alice, bob } = await establishSessions();

  const msg = ratchetEncrypt(alice, utf8ToBytes('one-time'));
  assert.equal(decode(ratchetDecrypt(bob, msg)), 'one-time');

  assert.throws(() => ratchetDecrypt(bob, msg), /[Rr]eplay/);
});

test('tampered ciphertext or header is rejected', async () => {
  const { alice, bob } = await establishSessions();

  const msg = ratchetEncrypt(alice, utf8ToBytes('integrity'));
  const flipped = (msg.ciphertext[0] === '0' ? '1' : '0') + msg.ciphertext.slice(1);

  assert.throws(() => ratchetDecrypt(bob, { ...msg, ciphertext: flipped }));
});

test('safety number is symmetric and 60 digits', async () => {
  const aliceId = await generateIdentity();
  const bobId = await generateIdentity();

  const fromAlice = computeSafetyNumber(aliceId.signing.publicKey, 'alice', bobId.signing.publicKey, 'bob');
  const fromBob = computeSafetyNumber(bobId.signing.publicKey, 'bob', aliceId.signing.publicKey, 'alice');

  assert.equal(fromAlice, fromBob);
  assert.equal(fromAlice.replace(/ /g, '').length, 60);
  assert.match(fromAlice, /^(\d{5} ){11}\d{5}$/);
});
