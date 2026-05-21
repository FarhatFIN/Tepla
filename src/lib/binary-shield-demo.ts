export type BinaryShieldPattern = {
  id: string;
  pattern: string;
  usesLeft: number;
};

export type BinaryShieldIssue = {
  seedPhrase?: string;
  recoveryPatterns: BinaryShieldPattern[];
  nextManualRotationAt?: string;
};

const WORDS = [
  "alpha", "bravo", "cipher", "delta", "echo", "flux", "guard", "helix",
  "ion", "jade", "kappa", "lumen", "matrix", "nova", "orbit", "pulse",
];

const randomBinaryPattern = () =>
  Array.from({ length: 8 }, () => (Math.random() > 0.5 ? "A" : "B")).join("");

const randomSeedPhrase = () => {
  const picked = Array.from({ length: 12 }, () => WORDS[Math.floor(Math.random() * WORDS.length)]);
  return picked.join(" ");
};

/** Client-side fallback when register API does not return shield payload. */
export const createDemoBinaryShield = (): BinaryShieldIssue => ({
  seedPhrase: randomSeedPhrase(),
  recoveryPatterns: Array.from({ length: 8 }, () => ({
    id: crypto.randomUUID(),
    pattern: randomBinaryPattern(),
    usesLeft: 1,
  })),
  nextManualRotationAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
});

export const parseBinaryShieldFromResponse = (
  payload: unknown,
): BinaryShieldIssue | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const shield = record.binaryShield ?? record.binary_shield;
  if (!shield || typeof shield !== "object") return null;
  const data = shield as Record<string, unknown>;
  const patterns = data.recoveryPatterns ?? data.recovery_patterns;
  if (!Array.isArray(patterns) || patterns.length === 0) return null;
  return {
    seedPhrase:
      typeof data.seedPhrase === "string"
        ? data.seedPhrase
        : typeof data.seed_phrase === "string"
          ? data.seed_phrase
          : undefined,
    recoveryPatterns: patterns.map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? `pattern-${index}`),
        pattern: String(row.pattern ?? ""),
        usesLeft: Number(row.usesLeft ?? row.uses_left ?? 1),
      };
    }),
    nextManualRotationAt:
      typeof data.nextManualRotationAt === "string"
        ? data.nextManualRotationAt
        : typeof data.next_manual_rotation_at === "string"
          ? data.next_manual_rotation_at
          : undefined,
  };
};
