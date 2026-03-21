-- ═══════════════════════════════════════════
-- Tepla Messenger — Database Schema v2.0
-- PostgreSQL 16 initialization script
-- ═══════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ──────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 4 AND 32),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  birth_date DATE,
  username_color TEXT,
  avatar_animation_enabled BOOLEAN DEFAULT false,
  voice_status_url TEXT,
  status_emoji TEXT,
  status_text TEXT,
  last_seen TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  public_key TEXT DEFAULT '',
  signing_public_key TEXT DEFAULT '',
  password_hash TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_online ON users(is_online);

-- ─── Chats ──────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group', 'channel', 'bot', 'saved')),
  name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  description TEXT,
  created_by UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  members_count INTEGER DEFAULT 0,
  slow_mode_seconds INTEGER DEFAULT 0,
  message_ttl_seconds INTEGER,
  invite_link TEXT,
  linked_chat_id UUID REFERENCES chats(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_created_by ON chats(created_by);

-- ─── Chat Members ───────────────────────────
CREATE TABLE IF NOT EXISTS chat_members (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'restricted', 'banned')),
  custom_title TEXT,
  permissions JSONB,
  muted_until TIMESTAMPTZ,
  is_anonymous BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user ON chat_members(user_id);
CREATE INDEX idx_chat_members_chat ON chat_members(chat_id);

-- ─── Messages ───────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL DEFAULT '',
  content_iv TEXT,
  encrypted_keys JSONB,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','video','audio','voice','file','sticker','gif','poll','location','contact','call','system')),
  reply_to_id UUID REFERENCES messages(id),
  forward_from_id UUID REFERENCES messages(id),
  forward_from_chat_id UUID REFERENCES chats(id),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  ttl_seconds INTEGER,
  expires_at TIMESTAMPTZ,
  media_group_id TEXT,
  entities JSONB,
  spark_count INTEGER DEFAULT 0,
  spark_senders_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_pinned ON messages(chat_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_messages_reply ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- ─── Message Reads (Read Receipts) ─────────
CREATE TABLE IF NOT EXISTS message_reads (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);

-- ─── Contacts ──────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_blocked BOOLEAN DEFAULT false,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, contact_user_id)
);
CREATE INDEX idx_contacts_user ON contacts(user_id);

-- ─── Reactions ──────────────────────────────
CREATE TABLE IF NOT EXISTS reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON reactions(message_id);

-- ─── Files (Attachments) ────────────────────
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES users(id),
  url TEXT NOT NULL,
  encrypted_url TEXT,
  type TEXT,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  width INTEGER,
  height INTEGER,
  duration_seconds REAL,
  file_name TEXT,
  is_spoiler BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_message ON files(message_id);

-- ─── Subscriptions (Premium) ────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL CHECK (plan IN ('free', 'monthly', 'yearly', 'lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
  paddle_subscription_id TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;

-- ─── Sparks (Virtual Currency) ──────────────
CREATE TABLE IF NOT EXISTS sparks_wallet (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS sparks_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  chat_id UUID REFERENCES chats(id),
  message_id UUID REFERENCES messages(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sparks_tx_from ON sparks_transactions(from_user_id);
CREATE INDEX idx_sparks_tx_to ON sparks_transactions(to_user_id);

-- ─── Push Subscriptions ─────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

-- ─── Notifications ──────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- ─── User Settings ──────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Moderation Reports ─────────────────────
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  reviewer_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_mod_reports_status ON moderation_reports(status);

-- ─── Active Sessions ────────────────────────
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON active_sessions(user_id);

-- ─── Polls ──────────────────────────────────
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  allows_multiple BOOLEAN DEFAULT false,
  close_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (poll_id, user_id, option_index)
);

-- ─── Payments (TON) ─────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(20, 8) NOT NULL,
  currency TEXT DEFAULT 'TON',
  transaction_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);

-- ═══════════════════════════════════════════
-- NEW FEATURES v2.1
-- ═══════════════════════════════════════════

-- ─── Calls ────────────────────────────────
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id),
  initiator_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL DEFAULT 'voice',
  status TEXT NOT NULL DEFAULT 'ringing',
  is_group BOOLEAN DEFAULT false,
  livekit_room TEXT,
  recording_url TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_participants (
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT false,
  is_video_on BOOLEAN DEFAULT false,
  is_screen_sharing BOOLEAN DEFAULT false,
  PRIMARY KEY (call_id, user_id)
);

CREATE INDEX idx_calls_chat ON calls(chat_id);
CREATE INDEX idx_calls_status ON calls(status);

-- ─── Threads ──────────────────────────────
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id),
  root_message_id UUID NOT NULL REFERENCES messages(id),
  title TEXT,
  creator_id UUID NOT NULL REFERENCES users(id),
  replies_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  participant_ids UUID[] DEFAULT '{}',
  is_closed BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add thread_id to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES threads(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_silent BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_info JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_note_info JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS translated_content JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS keyboard JSONB;

CREATE INDEX idx_threads_chat ON threads(chat_id);
CREATE INDEX idx_messages_thread ON messages(thread_id) WHERE thread_id IS NOT NULL;

-- ─── Scheduled Messages ───────────────────
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  scheduled_at TIMESTAMPTZ NOT NULL,
  is_silent BOOLEAN DEFAULT false,
  attachment_ids JSONB DEFAULT '[]',
  thread_id UUID REFERENCES threads(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_ready ON scheduled_messages(scheduled_at) WHERE sent_at IS NULL;

-- ─── Chat Folders ─────────────────────────
CREATE TABLE IF NOT EXISTS chat_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  icon TEXT,
  position INTEGER DEFAULT 0,
  filter_include_types JSONB DEFAULT '[]',
  filter_exclude_muted BOOLEAN DEFAULT false,
  filter_exclude_read BOOLEAN DEFAULT false,
  filter_include_unread BOOLEAN DEFAULT false,
  pinned_chat_ids JSONB DEFAULT '[]',
  included_chat_ids JSONB DEFAULT '[]',
  excluded_chat_ids JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_folders_user ON chat_folders(user_id);

-- ─── Bots ─────────────────────────────────
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  about_text TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  api_token TEXT UNIQUE NOT NULL,
  is_inline BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  commands JSONB DEFAULT '[]',
  menu_button JSONB,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bots_owner ON bots(owner_id);
CREATE INDEX idx_bots_token ON bots(api_token);

-- ─── Stories ──────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL DEFAULT 'image',
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  duration INTEGER DEFAULT 5,
  background_color TEXT,
  text_style TEXT,
  views_count INTEGER DEFAULT 0,
  reactions_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  privacy TEXT DEFAULT 'everyone',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_views (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  reaction TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, user_id)
);

CREATE INDEX idx_stories_user ON stories(user_id);
CREATE INDEX idx_stories_expires ON stories(expires_at);

-- ─── Sticker Packs ────────────────────────
CREATE TABLE IF NOT EXISTS sticker_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES users(id),
  type TEXT DEFAULT 'static',
  thumbnail_url TEXT,
  is_official BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  install_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES sticker_packs(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER DEFAULT 512,
  height INTEGER DEFAULT 512,
  is_animated BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sticker_installs (
  user_id UUID NOT NULL REFERENCES users(id),
  pack_id UUID NOT NULL REFERENCES sticker_packs(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, pack_id)
);

CREATE TABLE IF NOT EXISTS sticker_usage (
  user_id UUID NOT NULL REFERENCES users(id),
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, sticker_id)
);

CREATE INDEX idx_stickers_pack ON stickers(pack_id);
CREATE INDEX idx_stickers_emoji ON stickers(emoji);

-- ─── WebApps / Mini Apps ──────────────────
CREATE TABLE IF NOT EXISTS webapps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES users(id),
  bot_id UUID REFERENCES bots(id),
  name TEXT NOT NULL,
  short_name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  screenshots JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  is_premium_only BOOLEAN DEFAULT false,
  install_count INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webapp_ratings (
  webapp_id UUID NOT NULL REFERENCES webapps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (webapp_id, user_id)
);

CREATE INDEX idx_webapps_category ON webapps(category) WHERE is_published = true;

-- ─── Payment Invoices ─────────────────────
CREATE TABLE IF NOT EXISTS payment_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES bots(id),
  chat_id UUID NOT NULL REFERENCES chats(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payload TEXT,
  provider TEXT DEFAULT 'sparks',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- ─── Store Items ──────────────────────────
CREATE TABLE IF NOT EXISTS store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  category TEXT DEFAULT 'general',
  stock INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
