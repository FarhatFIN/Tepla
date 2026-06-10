import type { UserId } from './user.js';
import type { ChatId } from './chat.js';
import type { MessageId } from './message.js';

export type SparksGiftId = 'rose' | 'fire' | 'diamond' | 'crown';

export type SparksTransactionType =
  | 'purchase'
  | 'user_transfer'
  | 'message_spark'
  | 'channel_donation'
  | 'gift_rose'
  | 'gift_fire'
  | 'gift_diamond'
  | 'gift_crown';

export interface SparksWallet {
  userId: UserId;
  balance: number;
  updatedAt: string;
}

export interface SparksTransaction {
  id: string;
  fromUserId?: UserId;
  toUserId?: UserId;
  chatId?: ChatId;
  messageId?: MessageId;
  amount: number;
  type: SparksTransactionType;
  createdAt: string;
}

export interface SparksGift {
  id: SparksGiftId;
  amount: number;
  emoji: string;
}

export interface SparksPackage {
  id: string;
  amount: number;
  priceRub: number;
}

export interface MessageSparkSummary {
  totalAmount: number;
  sendersCount: number;
  currentUserSent: boolean;
}
