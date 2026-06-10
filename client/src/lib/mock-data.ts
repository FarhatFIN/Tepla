import { Chat, Message, ChatFolder, UserStories } from "@/types";

const users = [
  { id: "2", name: "Anna", username: "anna", status: "offline" as const, lastSeen: "yesterday 23:15" },
  { id: "3", name: "Dmitry", username: "dmitry_dev", status: "online" as const, bio: "Backend developer" },
  { id: "4", name: "Maria", username: "maria_design", status: "offline" as const, lastSeen: "today 09:30" },
  { id: "5", name: "Tepla Team", status: "offline" as const },
  { id: "6", name: "Sergey", username: "sergey", status: "offline" as const, lastSeen: "2 hours ago" },
  { id: "7", name: "Ekaterina", username: "kate_qa", status: "online" as const },
  { id: "8", name: "Alex Bot", username: "alex_bot", status: "online" as const },
];

export const mockChats: Chat[] = [
  { id: "c1", type: "direct", name: "Anna", user: users[0], lastMessage: { text: "Great, thanks!", senderId: "2", timestamp: "12:45", type: "text" }, unreadCount: 2, isPinned: true },
  { id: "c2", type: "direct", name: "Dmitry", user: users[1], lastMessage: { text: "Call at 15:00, don't forget", senderId: "3", timestamp: "10:20", type: "text" }, unreadCount: 1 },
  { id: "c3", type: "direct", name: "Maria", user: users[2], lastMessage: { text: "Updated mockups in Figma", senderId: "4", timestamp: "yesterday", type: "text" }, unreadCount: 0 },
  { id: "c4", type: "group", name: "Tepla Team", membersCount: 6, lastMessage: { text: "Deploy scheduled for Friday", senderId: "3", senderName: "Dmitry", timestamp: "yesterday", type: "text" }, unreadCount: 5 },
  { id: "c5", type: "direct", name: "Sergey", user: users[4], lastMessage: { text: "Check my PR when you have time", senderId: "6", timestamp: "Mon", type: "text" }, unreadCount: 0 },
  { id: "c6", type: "direct", name: "Ekaterina", user: users[5], lastMessage: { text: "Fixed the notification bug", senderId: "7", timestamp: "Mon", type: "text" }, unreadCount: 0 },
  { id: "c7", type: "channel", name: "Tepla News", membersCount: 1240, lastMessage: { text: "v2.0 Release Announcement", senderId: "5", senderName: "Admin", timestamp: "today", type: "text" }, unreadCount: 3 },
  { id: "c8", type: "bot", name: "Alex Bot", user: users[6], lastMessage: { text: "How can I help?", senderId: "8", timestamp: "now", type: "text" }, unreadCount: 0 },
];

const today = "2026-03-19";
const yesterday = "2026-03-18";

export const mockMessages: Record<string, Message[]> = {
  c1: [
    { id: "m1", chatId: "c1", senderId: "2", senderName: "Anna", text: "Hey! How's the layout going?", type: "text", timestamp: "10:00", date: yesterday, status: "read" },
    { id: "m2", chatId: "c1", senderId: "me", senderName: "Ilya", text: "Almost done, just need to finish the theme", type: "text", timestamp: "10:05", date: yesterday, status: "read" },
    { id: "m3", chatId: "c1", senderId: "2", senderName: "Anna", text: "Cool. I checked the mockups, looks great!", type: "text", timestamp: "10:10", date: yesterday, status: "read", reactions: [{ emoji: "\u{1F44D}", count: 2, users: ["me", "2"], myReaction: true }] },
    { id: "m4", chatId: "c1", senderId: "me", senderName: "Ilya", text: "Dark theme is default, right?", type: "text", timestamp: "12:00", date: today, status: "read" },
    { id: "m5", chatId: "c1", senderId: "2", senderName: "Anna", text: "Yes, dark by default. But light is needed too", type: "text", timestamp: "12:10", date: today, status: "read" },
    { id: "m6", chatId: "c1", senderId: "me", senderName: "Ilya", text: "Got it, I'll add a toggle", type: "text", timestamp: "12:15", date: today, status: "read" },
    { id: "m7", chatId: "c1", senderId: "2", senderName: "Anna", text: "By the way, accent color should be sky blue like in the mockup", type: "text", timestamp: "12:30", date: today, status: "read" },
    { id: "m8", chatId: "c1", senderId: "me", senderName: "Ilya", text: "Already using sky for accent!", type: "text", timestamp: "12:35", date: today, status: "delivered" },
    { id: "m9", chatId: "c1", senderId: "2", senderName: "Anna", text: "Great, thanks!", type: "text", timestamp: "12:45", date: today, status: "read", reactions: [{ emoji: "\u{2764}\u{FE0F}", count: 1, users: ["me"], myReaction: true }] },
  ],
  c2: [
    { id: "m20", chatId: "c2", senderId: "3", senderName: "Dmitry", text: "Hey, seen the new design?", type: "text", timestamp: "14:00", date: yesterday, status: "read" },
    { id: "m21", chatId: "c2", senderId: "me", senderName: "Ilya", text: "Yeah, looks awesome! Maria did great", type: "text", timestamp: "14:05", date: yesterday, status: "read" },
    { id: "m22", chatId: "c2", senderId: "3", senderName: "Dmitry", text: "Agreed. Need to discuss some architecture points", type: "text", timestamp: "14:10", date: yesterday, status: "read" },
    { id: "m23", chatId: "c2", senderId: "3", senderName: "Dmitry", text: "Call at 15:00, don't forget", type: "text", timestamp: "10:20", date: today, status: "read" },
  ],
  c4: [
    { id: "m40", chatId: "c4", senderId: "3", senderName: "Dmitry", text: "Hi everyone! Updated the sprint plan", type: "text", timestamp: "09:00", date: yesterday, status: "read" },
    { id: "m41", chatId: "c4", senderId: "4", senderName: "Maria", text: "Ok, will check", type: "text", timestamp: "09:15", date: yesterday, status: "read" },
    { id: "m42", chatId: "c4", senderId: "me", senderName: "Ilya", text: "Frontend on schedule, will finish layout by Wednesday", type: "text", timestamp: "09:30", date: yesterday, status: "read" },
    { id: "m43", chatId: "c4", senderId: "6", senderName: "Sergey", text: "Backend also on track. Auth API is ready", type: "text", timestamp: "10:00", date: yesterday, status: "read" },
    { id: "m44", chatId: "c4", senderId: "3", senderName: "Dmitry", text: "Deploy scheduled for Friday", type: "text", timestamp: "15:00", date: today, status: "read", isPinned: true, reactions: [{ emoji: "\u{1F680}", count: 4, users: ["me", "3", "4", "7"], myReaction: true }] },
  ],
};

export const mockFolders: ChatFolder[] = [
  { id: "f1", name: "Work", icon: "\u{1F4BC}", chatIds: ["c1", "c2", "c3", "c4", "c5", "c6"], color: "#0ea5e9" },
  { id: "f2", name: "Channels", icon: "\u{1F4E2}", chatIds: ["c7"], color: "#f59e0b" },
  { id: "f3", name: "Bots", icon: "\u{1F916}", chatIds: ["c8"], color: "#8b5cf6" },
];

export const mockStories: UserStories[] = [
  { userId: "me", userName: "My Story", stories: [{ id: "s0", userId: "me", userName: "Ilya", type: "text", text: "Working on Tepla 2.0!", backgroundColor: "#0ea5e9", createdAt: today, expiresAt: "2026-03-20", viewsCount: 12, isViewed: true }], hasUnviewed: false },
  { userId: "2", userName: "Anna", userAvatar: undefined, stories: [{ id: "s1", userId: "2", userName: "Anna", type: "text", text: "New design ready!", backgroundColor: "#8b5cf6", createdAt: today, expiresAt: "2026-03-20", viewsCount: 45, isViewed: false }], hasUnviewed: true },
  { userId: "7", userName: "Ekaterina", stories: [{ id: "s2", userId: "7", userName: "Ekaterina", type: "text", text: "QA complete!", backgroundColor: "#10b981", createdAt: today, expiresAt: "2026-03-20", viewsCount: 30, isViewed: false }], hasUnviewed: true },
  { userId: "3", userName: "Dmitry", stories: [{ id: "s3", userId: "3", userName: "Dmitry", type: "text", text: "Backend v2 is live", backgroundColor: "#ef4444", createdAt: today, expiresAt: "2026-03-20", viewsCount: 67, isViewed: true }], hasUnviewed: false },
];
