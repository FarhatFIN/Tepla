import sodium from "libsodium-wrappers";
import { randomBytes } from "@stablelib/random";

export type X25519KeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

export type Ed25519KeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

export type SymmetricKey = Uint8Array;

let sodiumReadyPromise: Promise<void> | null = null;

export const ensureSodiumReady = async (): Promise<void> => {
  if (!sodiumReadyPromise) {
    sodiumReadyPromise = sodium.ready;
  }
  await sodiumReadyPromise;
};

export const generateX25519KeyPair = async (): Promise<X25519KeyPair> => {
  await ensureSodiumReady();
  const keyPair = sodium.crypto_kx_keypair();
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.privateKey,
  };
};

export const generateEd25519KeyPair = async (): Promise<Ed25519KeyPair> => {
  await ensureSodiumReady();
  const keyPair = sodium.crypto_sign_keypair();
  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.privateKey,
  };
};

export const generateSymmetricKey = async (): Promise<SymmetricKey> => {
  await ensureSodiumReady();
  return randomBytes(sodium.crypto_secretbox_KEYBYTES);
};

