import sodium from "libsodium-wrappers";
import type { SymmetricKey } from "./keys";

export type Ciphertext = {
  nonce: string;
  payload: string;
};

export const encryptWithSymmetricKey = async (
  key: SymmetricKey,
  plaintext: Uint8Array,
): Promise<Ciphertext> => {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const boxed = sodium.crypto_secretbox_easy(plaintext, nonce, key);
  return {
    nonce: sodium.to_base64(nonce, sodium.base64_variants.URLSAFE_NO_PADDING),
    payload: sodium.to_base64(
      boxed,
      sodium.base64_variants.URLSAFE_NO_PADDING,
    ),
  };
};

export const decryptWithSymmetricKey = async (
  key: SymmetricKey,
  ciphertext: Ciphertext,
): Promise<Uint8Array> => {
  await sodium.ready;
  const nonce = sodium.from_base64(
    ciphertext.nonce,
    sodium.base64_variants.URLSAFE_NO_PADDING,
  );
  const boxed = sodium.from_base64(
    ciphertext.payload,
    sodium.base64_variants.URLSAFE_NO_PADDING,
  );
  const opened = sodium.crypto_secretbox_open_easy(boxed, nonce, key);
  return opened;
};

