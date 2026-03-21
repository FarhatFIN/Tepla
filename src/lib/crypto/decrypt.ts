import type { SymmetricKey } from "./keys";
import { decryptWithSymmetricKey, type Ciphertext } from "./encrypt";

export const decryptPayload = async (
  key: SymmetricKey,
  ciphertext: Ciphertext,
): Promise<string> => {
  const opened = await decryptWithSymmetricKey(key, ciphertext);
  const decoder = new TextDecoder();
  return decoder.decode(opened);
};

