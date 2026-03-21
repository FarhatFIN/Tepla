import sodium from "libsodium-wrappers";
import { HKDF } from "@stablelib/hkdf";
import { SHA256 } from "@stablelib/sha256";
import { generateX25519KeyPair, type X25519KeyPair } from "./keys";

export type SignalHeader = {
  ratchetPublicKey: string;
  previousChainLength: number;
  messageIndex: number;
};

export type SignalCiphertext = {
  header: SignalHeader;
  ciphertext: string;
  nonce: string;
};

export type SignalSessionState = {
  rootKey: Uint8Array;
  sendingChainKey: Uint8Array;
  receivingChainKey: Uint8Array;
  sendingIndex: number;
  receivingIndex: number;
  ourRatchetKey: X25519KeyPair;
  theirRatchetPublicKey: Uint8Array;
};

const KDF_INFO_ROOT = new TextEncoder().encode("Tepla/SignalRoot");
const KDF_INFO_CHAIN = new TextEncoder().encode("Tepla/SignalChain");

const kdfRoot = (rootKey: Uint8Array, dh: Uint8Array) => {
  const h = new HKDF(SHA256, dh, rootKey, KDF_INFO_ROOT);
  const okm = h.expand(64);
  h.clean();
  return {
    rootKey: okm.subarray(0, 32),
    chainKey: okm.subarray(32, 64),
  };
};

const kdfChain = (chainKey: Uint8Array) => {
  const h = new HKDF(SHA256, chainKey, undefined, KDF_INFO_CHAIN);
  const okm = h.expand(64);
  h.clean();
  return {
    nextChainKey: okm.subarray(0, 32),
    messageKey: okm.subarray(32, 64),
  };
};

const deriveMessageKey = async (chainKey: Uint8Array) => {
  await sodium.ready;
  const { nextChainKey, messageKey } = kdfChain(chainKey);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  return { nextChainKey, messageKey, nonce };
};

export const initializeSession = async (params: {
  rootKey: Uint8Array;
  ourEphemeral: X25519KeyPair;
  theirEphemeralPublicKey: Uint8Array;
}): Promise<SignalSessionState> => {
  await sodium.ready;
  const dh = sodium.crypto_scalarmult(
    params.ourEphemeral.secretKey,
    params.theirEphemeralPublicKey,
  );
  const { rootKey, chainKey } = kdfRoot(params.rootKey, dh);

  return {
    rootKey,
    sendingChainKey: chainKey,
    receivingChainKey: chainKey,
    sendingIndex: 0,
    receivingIndex: 0,
    ourRatchetKey: params.ourEphemeral,
    theirRatchetPublicKey: params.theirEphemeralPublicKey,
  };
};

export const encryptSignalMessage = async (
  session: SignalSessionState,
  plaintext: Uint8Array,
): Promise<{ session: SignalSessionState; message: SignalCiphertext }> => {
  await sodium.ready;
  const { nextChainKey, messageKey, nonce } = await deriveMessageKey(
    session.sendingChainKey,
  );

  const boxed = sodium.crypto_secretbox_easy(plaintext, nonce, messageKey);

  const header: SignalHeader = {
    ratchetPublicKey: sodium.to_base64(
      session.ourRatchetKey.publicKey,
      sodium.base64_variants.URLSAFE_NO_PADDING,
    ),
    previousChainLength: session.sendingIndex,
    messageIndex: session.sendingIndex,
  };

  const updatedSession: SignalSessionState = {
    ...session,
    sendingChainKey: nextChainKey,
    sendingIndex: session.sendingIndex + 1,
  };

  return {
    session: updatedSession,
    message: {
      header,
      ciphertext: sodium.to_base64(
        boxed,
        sodium.base64_variants.URLSAFE_NO_PADDING,
      ),
      nonce: sodium.to_base64(
        nonce,
        sodium.base64_variants.URLSAFE_NO_PADDING,
      ),
    },
  };
};

export const decryptSignalMessage = async (
  session: SignalSessionState,
  message: SignalCiphertext,
): Promise<{ session: SignalSessionState; plaintext: Uint8Array }> => {
  await sodium.ready;

  const ratchetPub = sodium.from_base64(
    message.header.ratchetPublicKey,
    sodium.base64_variants.URLSAFE_NO_PADDING,
  );

  let updatedSession = session;

  const theirKeyChanged = !sodium.memcmp(
    ratchetPub,
    session.theirRatchetPublicKey,
  );

  if (theirKeyChanged) {
    const newOurRatchet = await generateX25519KeyPair();
    const dh = sodium.crypto_scalarmult(
      newOurRatchet.secretKey,
      ratchetPub,
    );
    const { rootKey, chainKey } = kdfRoot(session.rootKey, dh);
    updatedSession = {
      ...session,
      rootKey,
      receivingChainKey: chainKey,
      theirRatchetPublicKey: ratchetPub,
      ourRatchetKey: newOurRatchet,
      receivingIndex: 0,
    };
  }

  const { nextChainKey, messageKey } = kdfChain(
    updatedSession.receivingChainKey,
  );

  const nonce = sodium.from_base64(
    message.nonce,
    sodium.base64_variants.URLSAFE_NO_PADDING,
  );
  const boxed = sodium.from_base64(
    message.ciphertext,
    sodium.base64_variants.URLSAFE_NO_PADDING,
  );

  const opened = sodium.crypto_secretbox_open_easy(
    boxed,
    nonce,
    messageKey,
  );

  const finalSession: SignalSessionState = {
    ...updatedSession,
    receivingChainKey: nextChainKey,
    receivingIndex: updatedSession.receivingIndex + 1,
  };

  return {
    session: finalSession,
    plaintext: opened,
  };
};

