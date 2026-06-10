import type { TeplaChat } from "@/types/chat";
import type { TeplaMessage } from "@/types/message";

const BASE_TIME = Date.parse("2026-03-16T10:30:00.000Z");

const atOffset = (minutesFromBase: number) =>
  new Date(BASE_TIME + minutesFromBase * 60_000).toISOString();

const message = (
  id: string,
  chatId: string,
  senderId: string,
  content: string,
  minutesFromBase: number,
  overrides: Partial<TeplaMessage> = {},
): TeplaMessage => ({
  id,
  clientMessageId: null,
  chatId,
  senderId,
  content,
  contentIv: null,
  encryptedKeys: null,
  type: "text",
  replyToMessageId: null,
  replyToId: null,
  replyToMessage: null,
  forwardFromId: null,
  forwardFromChatId: null,
  isEdited: false,
  editedAt: null,
  isDeleted: false,
  isPinned: false,
  viewsCount: 0,
  ttlSeconds: null,
  expiresAt: null,
  mediaGroupId: null,
  entities: null,
  attachments: [],
  reactions: [],
  createdAt: atOffset(minutesFromBase),
  ...overrides,
});

export const DEMO_CURRENT_USER = {
  id: "user-tepla-founder",
  username: "you",
  displayName: "You",
};

export const DEMO_CHATS: TeplaChat[] = [
  {
    id: "launch-war-room",
    type: "group",
    name: "Launch War Room",
    username: "launch",
    avatarUrl: null,
    description: "Shipping blockers, growth spikes, and launch-day decisions.",
    createdBy: DEMO_CURRENT_USER.id,
    isPublic: false,
    isVerified: true,
    membersCount: 8,
    slowModeSeconds: 0,
    messageTtlSeconds: null,
    inviteLink: null,
    linkedChatId: null,
    createdAt: atOffset(-2_400),
  },
  {
    id: "design-foundry",
    type: "group",
    name: "Design Foundry",
    username: "design",
    avatarUrl: null,
    description: "Brand polish, motion, and product feel before the next push.",
    createdBy: DEMO_CURRENT_USER.id,
    isPublic: false,
    isVerified: false,
    membersCount: 5,
    slowModeSeconds: 0,
    messageTtlSeconds: null,
    inviteLink: null,
    linkedChatId: null,
    createdAt: atOffset(-2_000),
  },
  {
    id: "customer-voice",
    type: "channel",
    name: "Customer Voice",
    username: "customers",
    avatarUrl: null,
    description: "Support learnings, retention signals, and qualitative feedback.",
    createdBy: DEMO_CURRENT_USER.id,
    isPublic: false,
    isVerified: false,
    membersCount: 14,
    slowModeSeconds: 0,
    messageTtlSeconds: null,
    inviteLink: null,
    linkedChatId: null,
    createdAt: atOffset(-1_600),
  },
  {
    id: "tepla-ai",
    type: "bot",
    name: "Tepla AI",
    username: "tepla_ai",
    avatarUrl: null,
    description: "Draft launch updates, summarize threads, and unblock decisions.",
    createdBy: DEMO_CURRENT_USER.id,
    isPublic: false,
    isVerified: true,
    membersCount: 2,
    slowModeSeconds: 0,
    messageTtlSeconds: null,
    inviteLink: null,
    linkedChatId: null,
    createdAt: atOffset(-1_200),
  },
];

export const DEMO_CHAT_META: Record<
  string,
  {
    unreadCount: number;
    pinnedNote: string;
    online: boolean;
    companionId: string;
    companionName: string;
  }
> = {
  "launch-war-room": {
    unreadCount: 3,
    pinnedNote: "Tonight's goal: keep send latency below 250ms and close the onboarding gap.",
    online: true,
    companionId: "user-maya",
    companionName: "Maya",
  },
  "design-foundry": {
    unreadCount: 1,
    pinnedNote: "Polish pass: simplify shadows, tighten spacing, and make the motion intentional.",
    online: true,
    companionId: "user-iris",
    companionName: "Iris",
  },
  "customer-voice": {
    unreadCount: 7,
    pinnedNote: "Top complaint this week: users want clearer delivery/read states and faster search.",
    online: false,
    companionId: "user-noah",
    companionName: "Noah",
  },
  "tepla-ai": {
    unreadCount: 0,
    pinnedNote: "Try asking for a launch update, a growth summary, or a sharper product headline.",
    online: true,
    companionId: "user-tepla-ai",
    companionName: "Tepla AI",
  },
};

export const DEMO_MESSAGES_BY_CHAT: Record<string, TeplaMessage[]> = {
  "launch-war-room": [
    message(
      "m-launch-1",
      "launch-war-room",
      "user-maya",
      "Pushed the socket stability patch. Reconnects feel much better now.",
      -145,
      { isPinned: true },
    ),
    message(
      "m-launch-2",
      "launch-war-room",
      DEMO_CURRENT_USER.id,
      "Perfect. Next priority is making the chat feel premium instead of like an internal prototype.",
      -138,
    ),
    message(
      "m-launch-3",
      "launch-war-room",
      "user-maya",
      "Agreed. If we tighten the composer, improve previews, and add better delivery states, it will read much more like a real product.",
      -132,
    ),
    message(
      "m-launch-4",
      "launch-war-room",
      "user-jon",
      "Traffic spike from the waitlist email. Session length is up 18% after the last visual pass.",
      -108,
    ),
    message(
      "m-launch-5",
      "launch-war-room",
      DEMO_CURRENT_USER.id,
      "Let's keep that momentum and make this build feel investor-demo ready.",
      -95,
    ),
  ],
  "design-foundry": [
    message(
      "m-design-1",
      "design-foundry",
      "user-iris",
      "The shell is strong. What it needs now is hierarchy: a bolder sidebar, clearer chat header, and messages that breathe.",
      -180,
    ),
    message(
      "m-design-2",
      "design-foundry",
      DEMO_CURRENT_USER.id,
      "I also want the empty states and loading states to feel branded, not generic.",
      -176,
    ),
    message(
      "m-design-3",
      "design-foundry",
      "user-iris",
      "Yes. Treat every idle state like a pitch deck slide: crisp copy, confidence, and one obvious next action.",
      -171,
    ),
  ],
  "customer-voice": [
    message(
      "m-customer-1",
      "customer-voice",
      "user-noah",
      "Users keep asking whether messages were delivered, read, or just sitting locally.",
      -205,
    ),
    message(
      "m-customer-2",
      "customer-voice",
      "user-noah",
      "Search also feels shallow. They expect to find by name, handle, and snippet.",
      -201,
    ),
    message(
      "m-customer-3",
      "customer-voice",
      DEMO_CURRENT_USER.id,
      "Makes sense. We should make the product feel trustworthy before we pile on more features.",
      -194,
    ),
  ],
  "tepla-ai": [
    message(
      "m-ai-1",
      "tepla-ai",
      "user-tepla-ai",
      "I can help draft launch notes, summarize a thread, or turn rough thoughts into polished product copy.",
      -90,
    ),
    message(
      "m-ai-2",
      "tepla-ai",
      "user-tepla-ai",
      "Try one of the quick prompts below the composer to see how Tepla could feel as an AI-native messenger.",
      -88,
    ),
  ],
};

export const isDemoChat = (chatId: string | null): chatId is string =>
  Boolean(chatId && DEMO_MESSAGES_BY_CHAT[chatId]);

export const getDemoChat = (chatId: string | null) =>
  DEMO_CHATS.find((chat) => chat.id === chatId) ?? null;

export const getDemoMessages = (chatId: string) =>
  (DEMO_MESSAGES_BY_CHAT[chatId] ?? []).map((item) => ({ ...item }));

export const buildDemoReply = (chatId: string, prompt: string): TeplaMessage | null => {
  const normalized = prompt.trim();
  const lower = normalized.toLowerCase();
  const companion = DEMO_CHAT_META[chatId];

  if (!companion || !normalized) {
    return null;
  }

  if (chatId === "tepla-ai") {
    let content =
      "Here is a sharper version: Tepla turns private messaging into a premium real-time workspace with AI built into the flow.";

    if (lower.includes("launch")) {
      content =
        "Launch update draft: shipped a product-quality chat shell, tightened realtime reliability, and improved the experience around message states, search, and demos.";
    } else if (lower.includes("summary")) {
      content =
        "Summary: the biggest wins are stronger conversation UX, clearer information density, and a backend path that now behaves like a real product surface.";
    } else if (lower.includes("headline")) {
      content =
        "Headline idea: Private messaging for teams that move like a startup and think with AI.";
    }

    return message(
      `demo-reply-${chatId}-${normalized.length}`,
      chatId,
      companion.companionId,
      content,
      -5,
    );
  }

  if (chatId === "launch-war-room") {
    return message(
      `demo-reply-${chatId}-${normalized.length}`,
      chatId,
      companion.companionId,
      "Love it. If we keep the product feeling this crisp, the story becomes much easier to sell.",
      -4,
    );
  }

  if (chatId === "design-foundry") {
    return message(
      `demo-reply-${chatId}-${normalized.length}`,
      chatId,
      companion.companionId,
      "That direction works. Keep the layout confident and cut any component that feels like scaffolding.",
      -3,
    );
  }

  return message(
    `demo-reply-${chatId}-${normalized.length}`,
    chatId,
    companion.companionId,
    "Logged. This is exactly the kind of signal that should feed the next quality pass.",
    -2,
  );
};
