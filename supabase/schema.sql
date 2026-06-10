-- Tepla Supabase schema + RLS + indexes
-- This file is intended to be applied to your Supabase project
-- via the Supabase SQL editor or CLI.

-- Extensions ------------------------------------------------------------------

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- USERS -----------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone varchar(20) unique,
  email varchar(255) unique,
  username varchar(32) unique not null,
  display_name varchar(64),
  avatar_url text,
  avatar_thumb_url text,
  bio text,
  birth_date date,
  username_color varchar(20),
  avatar_animation_enabled boolean default false,
  voice_status_url text,
  voice_status_duration_seconds float,
  status_emoji varchar(10),
  status_text varchar(100),
  last_seen timestamptz,
  is_online boolean default false,
  is_verified boolean default false,
  password_hash text,
  public_key text not null,
  signing_public_key text not null,
  language varchar(10) default 'en',
  created_at timestamptz default now()
);

alter table public.users
  drop constraint if exists users_username_format;

alter table public.users
  add column if not exists birth_date date;

alter table public.users
  add column if not exists username_color varchar(20);

alter table public.users
  add column if not exists avatar_animation_enabled boolean default false;

alter table public.users
  add column if not exists voice_status_url text;

alter table public.users
  add column if not exists voice_status_duration_seconds float;

alter table public.users
  add constraint users_username_format
  check (username ~ '^[A-Za-z0-9_]{4,32}$');

comment on table public.users is 'Public user profile mapped to auth.users (id = auth.uid()).';

-- CHATS -----------------------------------------------------------------------

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  type varchar(20) not null, -- direct, group, channel, bot, saved
  name varchar(100),
  username varchar(32) unique, -- for public groups/channels
  avatar_url text,
  description text,
  created_by uuid references public.users(id),
  is_public boolean default false,
  is_verified boolean default false,
  members_count int default 0,
  slow_mode_seconds int default 0,
  message_ttl_seconds int, -- disappearing messages
  invite_link varchar(100) unique,
  linked_chat_id uuid references public.chats(id),
  created_at timestamptz default now()
);

-- CHAT MEMBERS ----------------------------------------------------------------

create table if not exists public.chat_members (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role varchar(20) default 'member', -- owner, admin, member, restricted, banned
  custom_title varchar(32),
  permissions jsonb default '{}'::jsonb,
  muted_until timestamptz,
  is_anonymous boolean default false,
  joined_at timestamptz default now(),
  unique (chat_id, user_id)
);

-- FAVORITE CHATS --------------------------------------------------------------

create table if not exists public.favorite_chats (
  user_id uuid references public.users(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, chat_id)
);

-- MESSAGES --------------------------------------------------------------------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_message_id varchar(64),
  chat_id uuid references public.chats(id) on delete cascade,
  sender_id uuid references public.users(id),
  content text, -- encrypted ciphertext
  content_iv text, -- encryption nonce
  encrypted_keys jsonb, -- per-recipient encrypted symmetric keys
  type varchar(20) default 'text', -- text, image, video, audio, voice, file, sticker, gif, poll, location, contact, call, system
  reply_to_id uuid references public.messages(id),
  forward_from_id uuid references public.messages(id),
  forward_from_chat_id uuid references public.chats(id),
  is_edited boolean default false,
  edited_at timestamptz,
  is_deleted boolean default false,
  is_pinned boolean default false,
  views_count int default 0,
  ttl_seconds int,
  expires_at timestamptz,
  media_group_id uuid,
  entities jsonb,
  created_at timestamptz default now()
);

alter table public.messages
  add column if not exists spark_count bigint default 0;

alter table public.messages
  add column if not exists spark_senders_count int default 0;

-- MESSAGE READS --------------------------------------------------------------

create table if not exists public.message_reads (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- REACTIONS -------------------------------------------------------------------

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  emoji varchar(10) not null,
  created_at timestamptz default now(),
  unique (message_id, user_id, emoji)
);

-- FILES / MEDIA --------------------------------------------------------------

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  uploader_id uuid references public.users(id),
  url text not null,
  encrypted_url text,
  thumbnail_url text,
  type varchar(20),
  mime_type varchar(100),
  size_bytes bigint,
  width int,
  height int,
  duration_seconds float,
  file_name text,
  is_spoiler boolean default false,
  created_at timestamptz default now()
);

-- POLLS -----------------------------------------------------------------------

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete cascade,
  question text not null,
  options jsonb not null,
  type varchar(20) default 'regular',
  correct_option_id int,
  is_closed boolean default false,
  closes_at timestamptz,
  total_voters int default 0,
  created_at timestamptz default now()
);

create table if not exists public.poll_votes (
  poll_id uuid references public.polls(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  option_index int not null,
  voted_at timestamptz default now(),
  primary key (poll_id, user_id)
);

-- STORIES ---------------------------------------------------------------------

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  media_url text not null,
  thumbnail_url text,
  type varchar(10) not null, -- photo, video
  caption text,
  entities jsonb,
  privacy varchar(20) default 'contacts', -- everyone, contacts, selected, hidden
  selected_user_ids uuid[],
  reactions_count int default 0,
  views_count int default 0,
  expires_at timestamptz default (now() + interval '24 hours'),
  created_at timestamptz default now()
);

create table if not exists public.story_views (
  story_id uuid references public.stories(id) on delete cascade,
  viewer_id uuid references public.users(id) on delete cascade,
  reaction varchar(10),
  viewed_at timestamptz default now(),
  primary key (story_id, viewer_id)
);

-- CALLS -----------------------------------------------------------------------

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id),
  initiator_id uuid references public.users(id),
  type varchar(10) not null, -- audio, video
  status varchar(20) default 'ringing',
  livekit_room_name text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  created_at timestamptz default now()
);

create table if not exists public.call_participants (
  call_id uuid references public.calls(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz,
  left_at timestamptz,
  was_video_on boolean default false,
  was_screen_sharing boolean default false,
  primary key (call_id, user_id)
);

-- CONTACTS --------------------------------------------------------------------

create table if not exists public.contacts (
  user_id uuid references public.users(id) on delete cascade,
  contact_id uuid references public.users(id) on delete cascade,
  nickname varchar(64),
  is_blocked boolean default false,
  is_favorite boolean default false,
  created_at timestamptz default now(),
  primary key (user_id, contact_id)
);

-- BOTS ------------------------------------------------------------------------

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  token text unique not null,
  name varchar(64),
  username varchar(32) unique,
  description text,
  commands jsonb,
  webhook_url text,
  is_inline boolean default false,
  created_at timestamptz default now()
);

-- SCHEDULED MESSAGES ---------------------------------------------------------

create table if not exists public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade,
  sender_id uuid references public.users(id),
  content text,
  type varchar(20),
  scheduled_at timestamptz not null,
  is_sent boolean default false,
  created_at timestamptz default now()
);

-- SAVED MESSAGES TAGS --------------------------------------------------------

create table if not exists public.saved_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  tag varchar(50),
  created_at timestamptz default now()
);

-- USER SETTINGS --------------------------------------------------------------

create table if not exists public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  theme varchar(20) default 'dark',
  accent_color varchar(7) default '#2AABEE',
  font_size int default 14,
  message_density varchar(20) default 'comfortable',
  send_with_enter boolean default true,
  notifications_enabled boolean default true,
  notification_sound varchar(50) default 'default',
  show_read_receipts boolean default true,
  show_typing_indicator boolean default true,
  two_factor_enabled boolean default false,
  passcode_hash text,
  auto_download_mobile jsonb default '{"photos":true,"videos":false,"files":false}'::jsonb,
  auto_download_wifi jsonb default '{"photos":true,"videos":true,"files":true}'::jsonb,
  updated_at timestamptz default now()
);

-- FOLDERS ---------------------------------------------------------------------

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name varchar(50) not null,
  icon varchar(10),
  color varchar(7),
  chat_ids uuid[],
  position int default 0,
  created_at timestamptz default now()
);

-- SPARKS ----------------------------------------------------------------------

create table if not exists public.sparks_wallet (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz default now(),
  check (balance >= 0)
);

create table if not exists public.sparks_transactions (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references public.users(id) on delete set null,
  to_user_id uuid references public.users(id) on delete set null,
  chat_id uuid references public.chats(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  amount bigint not null,
  type varchar(32) not null,
  created_at timestamptz default now(),
  check (amount > 0)
);

create or replace function public.ensure_sparks_wallet(target_user_id uuid)
returns void
language plpgsql
as $$
begin
  if target_user_id is null then
    raise exception 'Target user is required.';
  end if;

  insert into public.sparks_wallet (user_id, balance)
  values (target_user_id, 0)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.handle_new_sparks_wallet()
returns trigger
language plpgsql
as $$
begin
  perform public.ensure_sparks_wallet(new.id);
  return new;
end;
$$;

drop trigger if exists on_users_create_sparks_wallet on public.users;

create trigger on_users_create_sparks_wallet
after insert on public.users
for each row
execute function public.handle_new_sparks_wallet();

create or replace function public.purchase_sparks(
  target_user_id uuid,
  spark_amount bigint
)
returns table(transaction_id uuid, balance bigint)
language plpgsql
as $$
declare
  next_transaction_id uuid;
  next_balance bigint;
begin
  if target_user_id is null then
    raise exception 'Target user is required.';
  end if;

  if spark_amount is null or spark_amount <= 0 then
    raise exception 'Spark amount must be positive.';
  end if;

  perform public.ensure_sparks_wallet(target_user_id);

  update public.sparks_wallet
  set balance = balance + spark_amount,
      updated_at = now()
  where user_id = target_user_id
  returning sparks_wallet.balance into next_balance;

  insert into public.sparks_transactions (
    from_user_id,
    to_user_id,
    chat_id,
    message_id,
    amount,
    type
  )
  values (
    null,
    target_user_id,
    null,
    null,
    spark_amount,
    'purchase'
  )
  returning id into next_transaction_id;

  return query select next_transaction_id, next_balance;
end;
$$;

create or replace function public.transfer_sparks(
  sender_user_id uuid,
  recipient_user_id uuid,
  spark_amount bigint,
  transaction_type varchar(32),
  target_chat_id uuid default null,
  target_message_id uuid default null
)
returns table(transaction_id uuid, sender_balance bigint, recipient_balance bigint)
language plpgsql
as $$
declare
  current_sender_balance bigint;
  next_sender_balance bigint;
  next_recipient_balance bigint;
  next_transaction_id uuid;
begin
  if sender_user_id is null or recipient_user_id is null then
    raise exception 'Sender and recipient are required.';
  end if;

  if spark_amount is null or spark_amount <= 0 then
    raise exception 'Spark amount must be positive.';
  end if;

  if sender_user_id = recipient_user_id then
    raise exception 'Cannot send sparks to yourself.';
  end if;

  perform public.ensure_sparks_wallet(sender_user_id);
  perform public.ensure_sparks_wallet(recipient_user_id);

  if sender_user_id::text <= recipient_user_id::text then
    perform 1 from public.sparks_wallet where user_id = sender_user_id for update;
    perform 1 from public.sparks_wallet where user_id = recipient_user_id for update;
  else
    perform 1 from public.sparks_wallet where user_id = recipient_user_id for update;
    perform 1 from public.sparks_wallet where user_id = sender_user_id for update;
  end if;

  select balance
    into current_sender_balance
  from public.sparks_wallet
  where user_id = sender_user_id;

  if current_sender_balance < spark_amount then
    raise exception 'Insufficient sparks balance.';
  end if;

  update public.sparks_wallet
  set balance = balance - spark_amount,
      updated_at = now()
  where user_id = sender_user_id
  returning sparks_wallet.balance into next_sender_balance;

  update public.sparks_wallet
  set balance = balance + spark_amount,
      updated_at = now()
  where user_id = recipient_user_id
  returning sparks_wallet.balance into next_recipient_balance;

  insert into public.sparks_transactions (
    from_user_id,
    to_user_id,
    chat_id,
    message_id,
    amount,
    type
  )
  values (
    sender_user_id,
    recipient_user_id,
    target_chat_id,
    target_message_id,
    spark_amount,
    coalesce(transaction_type, 'user_transfer')
  )
  returning id into next_transaction_id;

  return query select next_transaction_id, next_sender_balance, next_recipient_balance;
end;
$$;

-- PAYMENTS --------------------------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.users(id),
  recipient_id uuid references public.users(id),
  message_id uuid references public.messages(id),
  amount numeric(18,8) not null,
  currency varchar(10) not null, -- USD, TON, USDT
  status varchar(20) default 'pending',
  tx_hash text,
  created_at timestamptz default now()
);

-- PUSH NOTIFICATIONS SUBSCRIPTIONS -------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- AUTH / SECURITY AUX TABLES -------------------------------------------------

-- Active sessions across devices
create table if not exists public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  device_name text,
  ip_address inet,
  user_agent text,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

-- TOTP secrets for 2FA (stored encrypted at rest)
create table if not exists public.totp_secrets (
  user_id uuid primary key references public.users(id) on delete cascade,
  secret_encrypted text not null,
  created_at timestamptz default now()
);

-- Login audit log
create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  ip_address inet,
  user_agent text,
  successful boolean default false,
  created_at timestamptz default now()
);

-- INDEXES ---------------------------------------------------------------------

-- Users
create index if not exists idx_users_username on public.users (username);
create index if not exists idx_users_phone on public.users (phone);
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_last_seen on public.users (last_seen desc);

-- Chats
create index if not exists idx_chats_type on public.chats (type);
create index if not exists idx_chats_created_by on public.chats (created_by);
create index if not exists idx_chats_public on public.chats (is_public, type);

-- Chat members
create index if not exists idx_chat_members_chat_id on public.chat_members (chat_id);
create index if not exists idx_chat_members_user_id on public.chat_members (user_id);
create index if not exists idx_chat_members_role on public.chat_members (chat_id, role);

-- Favorite chats
create index if not exists idx_favorite_chats_user_id on public.favorite_chats (user_id);
create index if not exists idx_favorite_chats_chat_id on public.favorite_chats (chat_id);

-- Messages
create index if not exists idx_messages_chat_created_at on public.messages (chat_id, created_at desc);
create index if not exists idx_messages_sender_id on public.messages (sender_id);
create index if not exists idx_messages_media_group on public.messages (media_group_id);
create index if not exists idx_messages_ttl_expires on public.messages (expires_at);
create index if not exists idx_messages_reply_to_id on public.messages (reply_to_id);
create index if not exists idx_messages_pinned on public.messages (chat_id, is_pinned, created_at desc);
create index if not exists idx_messages_spark_count on public.messages (chat_id, spark_count desc);
create unique index if not exists idx_messages_chat_client_message_id
  on public.messages (chat_id, client_message_id)
  where client_message_id is not null;

-- Message reads
create index if not exists idx_message_reads_user_id on public.message_reads (user_id);

-- Reactions
create index if not exists idx_reactions_message_id on public.reactions (message_id);
create index if not exists idx_reactions_user_id on public.reactions (user_id);

-- Files
create index if not exists idx_files_message_id on public.files (message_id);
create index if not exists idx_files_uploader_id on public.files (uploader_id);
create index if not exists idx_files_type on public.files (type);

-- Polls
create index if not exists idx_polls_message_id on public.polls (message_id);
create index if not exists idx_poll_votes_user_id on public.poll_votes (user_id);

-- Stories
create index if not exists idx_stories_user_id on public.stories (user_id);
create index if not exists idx_stories_expires_at on public.stories (expires_at);
create index if not exists idx_story_views_viewer on public.story_views (viewer_id);

-- Calls
create index if not exists idx_calls_chat_id on public.calls (chat_id);
create index if not exists idx_calls_initiator_id on public.calls (initiator_id);
create index if not exists idx_call_participants_user_id on public.call_participants (user_id);

-- Contacts
create index if not exists idx_contacts_user_id on public.contacts (user_id);
create index if not exists idx_contacts_contact_id on public.contacts (contact_id);

-- Bots
create index if not exists idx_bots_user_id on public.bots (user_id);

-- Scheduled messages
create index if not exists idx_scheduled_messages_chat_id on public.scheduled_messages (chat_id);
create index if not exists idx_scheduled_messages_sender_id on public.scheduled_messages (sender_id);
create index if not exists idx_scheduled_messages_scheduled_at on public.scheduled_messages (scheduled_at);

-- Saved tags
create index if not exists idx_saved_tags_user_id on public.saved_tags (user_id);
create index if not exists idx_saved_tags_message_id on public.saved_tags (message_id);

-- Folders
create index if not exists idx_folders_user_id on public.folders (user_id);

-- Sparks
create index if not exists idx_sparks_wallet_balance on public.sparks_wallet (balance desc);
create index if not exists idx_sparks_transactions_from_user_id on public.sparks_transactions (from_user_id);
create index if not exists idx_sparks_transactions_to_user_id on public.sparks_transactions (to_user_id);
create index if not exists idx_sparks_transactions_chat_id on public.sparks_transactions (chat_id);
create index if not exists idx_sparks_transactions_message_id on public.sparks_transactions (message_id);
create index if not exists idx_sparks_transactions_created_at on public.sparks_transactions (created_at desc);

-- Payments
create index if not exists idx_payments_sender_id on public.payments (sender_id);
create index if not exists idx_payments_recipient_id on public.payments (recipient_id);
create index if not exists idx_payments_message_id on public.payments (message_id);
create index if not exists idx_payments_created_at on public.payments (created_at desc);

-- Push subscriptions
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions (user_id);

-- Active sessions
create index if not exists idx_active_sessions_user_id on public.active_sessions (user_id);
create index if not exists idx_active_sessions_last_seen_at on public.active_sessions (last_seen_at desc);

-- Login events
create index if not exists idx_login_events_user_id on public.login_events (user_id);
create index if not exists idx_login_events_created_at on public.login_events (created_at desc);

-- RLS POLICIES ---------------------------------------------------------------

-- Enable RLS on all user-facing tables
alter table public.users enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.favorite_chats enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.reactions enable row level security;
alter table public.files enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.contacts enable row level security;
alter table public.bots enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.saved_tags enable row level security;
alter table public.user_settings enable row level security;
alter table public.folders enable row level security;
alter table public.sparks_wallet enable row level security;
alter table public.sparks_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.active_sessions enable row level security;
alter table public.totp_secrets enable row level security;
alter table public.login_events enable row level security;

-- USERS: anyone authenticated can read minimal profile, only owner can update

create policy "users_select_all_authenticated"
  on public.users
  for select
  using (auth.role() = 'authenticated');

create policy "users_update_self"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users_insert_self"
  on public.users
  for insert
  with check (auth.uid() = id);

-- CHATS: visible if public or user is a member

create policy "chats_select_public_or_member"
  on public.chats
  for select
  using (
    is_public
    or exists (
      select 1
      from public.chat_members cm
      where cm.chat_id = chats.id
        and cm.user_id = auth.uid()
    )
  );

create policy "chats_insert_creator"
  on public.chats
  for insert
  with check (created_by = auth.uid());

create policy "chats_update_admins"
  on public.chats
  for update
  using (
    exists (
      select 1
      from public.chat_members cm
      where cm.chat_id = chats.id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.chat_members cm
      where cm.chat_id = chats.id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- CHAT MEMBERS: user sees their own memberships and memberships of chats they admin

create policy "chat_members_select_member_or_admin"
  on public.chat_members
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.chat_members cm2
      where cm2.chat_id = chat_members.chat_id
        and cm2.user_id = auth.uid()
        and cm2.role in ('owner', 'admin')
    )
  );

create policy "chat_members_insert_admins"
  on public.chat_members
  for insert
  with check (
    exists (
      select 1
      from public.chat_members cm2
      where cm2.chat_id = chat_members.chat_id
        and cm2.user_id = auth.uid()
        and cm2.role in ('owner', 'admin')
    )
  );

create policy "chat_members_update_admins"
  on public.chat_members
  for update
  using (
    exists (
      select 1
      from public.chat_members cm2
      where cm2.chat_id = chat_members.chat_id
        and cm2.user_id = auth.uid()
        and cm2.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.chat_members cm2
      where cm2.chat_id = chat_members.chat_id
        and cm2.user_id = auth.uid()
        and cm2.role in ('owner', 'admin')
    )
  );

-- FAVORITE CHATS: users manage their own favorites

create policy "favorite_chats_select_own"
  on public.favorite_chats
  for select
  using (user_id = auth.uid());

create policy "favorite_chats_insert_own"
  on public.favorite_chats
  for insert
  with check (user_id = auth.uid());

create policy "favorite_chats_delete_own"
  on public.favorite_chats
  for delete
  using (user_id = auth.uid());

-- MESSAGES: visible if user is member of chat; insert if member and not banned

create policy "messages_select_chat_member"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.chat_members cm
      where cm.chat_id = messages.chat_id
        and cm.user_id = auth.uid()
        and cm.role != 'banned'
    )
  );

create policy "messages_insert_chat_member"
  on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chat_members cm
      where cm.chat_id = messages.chat_id
        and cm.user_id = auth.uid()
        and cm.role not in ('banned', 'restricted')
    )
  );

create policy "messages_update_sender_or_admin"
  on public.messages
  for update
  using (
    sender_id = auth.uid()
    or exists (
      select 1
      from public.chat_members cm
      where cm.chat_id = messages.chat_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  )
  with check (
    sender_id = auth.uid()
    or exists (
      select 1
      from public.chat_members cm
      where cm.chat_id = messages.chat_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'admin')
    )
  );

-- MESSAGE READS: each user manages their own read receipts

create policy "message_reads_select_own"
  on public.message_reads
  for select
  using (user_id = auth.uid());

create policy "message_reads_insert_own"
  on public.message_reads
  for insert
  with check (user_id = auth.uid());

-- REACTIONS: user manages their own reactions

create policy "reactions_select_chat_member"
  on public.reactions
  for select
  using (
    exists (
      select 1
      from public.messages m
      join public.chat_members cm on cm.chat_id = m.chat_id
      where m.id = reactions.message_id
        and cm.user_id = auth.uid()
    )
  );

create policy "reactions_insert_own"
  on public.reactions
  for insert
  with check (user_id = auth.uid());

create policy "reactions_delete_own"
  on public.reactions
  for delete
  using (user_id = auth.uid());

-- FILES: accessible to members of the associated chat

create policy "files_select_chat_member"
  on public.files
  for select
  using (
    exists (
      select 1
      from public.messages m
      join public.chat_members cm on cm.chat_id = m.chat_id
      where m.id = files.message_id
        and cm.user_id = auth.uid()
    )
  );

create policy "files_insert_uploader"
  on public.files
  for insert
  with check (uploader_id = auth.uid());

-- POLLS & VOTES: restricted to chat members

create policy "polls_select_chat_member"
  on public.polls
  for select
  using (
    exists (
      select 1
      from public.messages m
      join public.chat_members cm on cm.chat_id = m.chat_id
      where m.id = polls.message_id
        and cm.user_id = auth.uid()
    )
  );

create policy "poll_votes_insert_own"
  on public.poll_votes
  for insert
  with check (user_id = auth.uid());

create policy "poll_votes_select_chat_member"
  on public.poll_votes
  for select
  using (
    exists (
      select 1
      from public.polls p
      join public.messages m on m.id = p.message_id
      join public.chat_members cm on cm.chat_id = m.chat_id
      where p.id = poll_votes.poll_id
        and cm.user_id = auth.uid()
    )
  );

-- STORIES & VIEWS ------------------------------------------------------------

create policy "stories_select_privacy"
  on public.stories
  for select
  using (
    -- own stories
    user_id = auth.uid()
    or privacy = 'everyone'
  );

create policy "stories_insert_owner"
  on public.stories
  for insert
  with check (user_id = auth.uid());

create policy "story_views_insert_viewer"
  on public.story_views
  for insert
  with check (viewer_id = auth.uid());

create policy "story_views_select_owner_or_viewer"
  on public.story_views
  for select
  using (
    viewer_id = auth.uid()
    or exists (
      select 1
      from public.stories s
      where s.id = story_views.story_id
        and s.user_id = auth.uid()
    )
  );

-- CALLS & PARTICIPANTS -------------------------------------------------------

create policy "calls_select_chat_member"
  on public.calls
  for select
  using (
    chat_id is null
    or exists (
      select 1
      from public.chat_members cm
      where cm.chat_id = calls.chat_id
        and cm.user_id = auth.uid()
    )
  );

create policy "calls_insert_initiator"
  on public.calls
  for insert
  with check (initiator_id = auth.uid());

create policy "call_participants_select_member"
  on public.call_participants
  for select
  using (user_id = auth.uid());

create policy "call_participants_insert_self"
  on public.call_participants
  for insert
  with check (user_id = auth.uid());

-- CONTACTS -------------------------------------------------------------------

create policy "contacts_select_own"
  on public.contacts
  for select
  using (user_id = auth.uid());

create policy "contacts_insert_own"
  on public.contacts
  for insert
  with check (user_id = auth.uid());

create policy "contacts_update_own"
  on public.contacts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- BOTS ------------------------------------------------------------------------

create policy "bots_select_owner"
  on public.bots
  for select
  using (user_id = auth.uid());

create policy "bots_insert_owner"
  on public.bots
  for insert
  with check (user_id = auth.uid());

create policy "bots_update_owner"
  on public.bots
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- SCHEDULED MESSAGES ---------------------------------------------------------

create policy "scheduled_messages_select_sender"
  on public.scheduled_messages
  for select
  using (sender_id = auth.uid());

create policy "scheduled_messages_insert_sender"
  on public.scheduled_messages
  for insert
  with check (sender_id = auth.uid());

-- SAVED TAGS -----------------------------------------------------------------

create policy "saved_tags_select_own"
  on public.saved_tags
  for select
  using (user_id = auth.uid());

create policy "saved_tags_insert_own"
  on public.saved_tags
  for insert
  with check (user_id = auth.uid());

-- USER SETTINGS --------------------------------------------------------------

create policy "user_settings_select_own"
  on public.user_settings
  for select
  using (user_id = auth.uid());

create policy "user_settings_upsert_own"
  on public.user_settings
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- FOLDERS --------------------------------------------------------------------

create policy "folders_select_own"
  on public.folders
  for select
  using (user_id = auth.uid());

create policy "folders_upsert_own"
  on public.folders
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sparks_wallet_select_own"
  on public.sparks_wallet
  for select
  using (user_id = auth.uid());

create policy "sparks_wallet_insert_own"
  on public.sparks_wallet
  for insert
  with check (user_id = auth.uid());

create policy "sparks_transactions_select_involved_or_chat_member"
  on public.sparks_transactions
  for select
  using (
    from_user_id = auth.uid()
    or to_user_id = auth.uid()
    or (
      chat_id is not null and exists (
        select 1
        from public.chat_members cm
        where cm.chat_id = sparks_transactions.chat_id
          and cm.user_id = auth.uid()
      )
    )
  );

-- PAYMENTS -------------------------------------------------------------------

create policy "payments_select_involved"
  on public.payments
  for select
  using (
    sender_id = auth.uid()
    or recipient_id = auth.uid()
  );

create policy "payments_insert_sender"
  on public.payments
  for insert
  with check (sender_id = auth.uid());

-- PUSH SUBSCRIPTIONS ---------------------------------------------------------

create policy "push_subscriptions_select_own"
  on public.push_subscriptions
  for select
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions
  for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions
  for delete
  using (user_id = auth.uid());

-- ACTIVE SESSIONS ------------------------------------------------------------

create policy "active_sessions_select_own"
  on public.active_sessions
  for select
  using (user_id = auth.uid());

create policy "active_sessions_upsert_own"
  on public.active_sessions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- TOTP SECRETS ---------------------------------------------------------------

create policy "totp_secrets_select_own"
  on public.totp_secrets
  for select
  using (user_id = auth.uid());

create policy "totp_secrets_upsert_own"
  on public.totp_secrets
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- LOGIN EVENTS: user can see their own, inserts done by backend

create policy "login_events_select_own"
  on public.login_events
  for select
  using (user_id = auth.uid());

