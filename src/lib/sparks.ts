import type { SparksGiftId, SparksTransactionType } from "@/types/sparks";

export const SPARK_PACKAGES = [100, 250, 500, 1000, 2500] as const;

export type SparksPackageAmount = (typeof SPARK_PACKAGES)[number];

export const isSparksPackageAmount = (value: unknown): value is SparksPackageAmount =>
  typeof value === "number" && SPARK_PACKAGES.includes(value as SparksPackageAmount);

export const SPARK_PACKAGE_PRICES: Record<
  SparksPackageAmount,
  {
    priceRub: number;
    priceLabel: string;
  }
> = {
  100: {
    priceRub: 179,
    priceLabel: "179 RUB",
  },
  250: {
    priceRub: 399,
    priceLabel: "399 RUB",
  },
  500: {
    priceRub: 749,
    priceLabel: "749 RUB",
  },
  1000: {
    priceRub: 1390,
    priceLabel: "1390 RUB",
  },
  2500: {
    priceRub: 3190,
    priceLabel: "3190 RUB",
  },
};

export const DEFAULT_SPARK_TRANSFER_AMOUNTS = [1, 5, 10, 25, 50] as const;

export const SPARK_GIFTS: Array<{
  id: SparksGiftId;
  label: string;
  cost: number;
}> = [
  { id: "rose", label: "Rose", cost: 10 },
  { id: "fire", label: "Fire", cost: 25 },
  { id: "diamond", label: "Diamond", cost: 100 },
  { id: "crown", label: "Crown", cost: 500 },
];

export const SPARK_GIFT_TRANSACTION_TYPES: Record<SparksGiftId, SparksTransactionType> = {
  rose: "gift_rose",
  fire: "gift_fire",
  diamond: "gift_diamond",
  crown: "gift_crown",
};

export const isSparksGiftId = (value: unknown): value is SparksGiftId =>
  typeof value === "string" && SPARK_GIFTS.some((gift) => gift.id === value);

export const getSparkGiftById = (giftId: SparksGiftId) =>
  SPARK_GIFTS.find((gift) => gift.id === giftId) ?? null;

export const SPARK_TRANSACTION_LABELS: Record<SparksTransactionType, string> = {
  purchase: "Purchase",
  user_transfer: "Transfer",
  message_spark: "Message support",
  channel_donation: "Channel donation",
  gift_rose: "Rose gift",
  gift_fire: "Fire gift",
  gift_diamond: "Diamond gift",
  gift_crown: "Crown gift",
};
