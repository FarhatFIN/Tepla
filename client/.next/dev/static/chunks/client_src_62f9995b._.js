(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/client/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "api",
    ()=>api,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/client/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const API_BASE = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v2";
class ApiClient {
    token = null;
    setToken(token) {
        this.token = token;
    }
    async request(path, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            ...options.headers
        };
        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers
        });
        if (!res.ok) {
            const err = await res.json().catch(()=>({
                    message: res.statusText
                }));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
        return res.json();
    }
    get(path) {
        return this.request(path);
    }
    post(path, body) {
        return this.request(path, {
            method: "POST",
            body: JSON.stringify(body)
        });
    }
    patch(path, body) {
        return this.request(path, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    }
    delete(path) {
        return this.request(path, {
            method: "DELETE"
        });
    }
    async upload(path, file, fields) {
        const form = new FormData();
        form.append("file", file);
        if (fields) Object.entries(fields).forEach(([k, v])=>form.append(k, v));
        const headers = {};
        if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
        const res = await fetch(`${API_BASE}${path}`, {
            method: "POST",
            headers,
            body: form
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        return res.json();
    }
}
const api = new ApiClient();
const __TURBOPACK__default__export__ = api;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/lib/mock-data.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mockChats",
    ()=>mockChats,
    "mockFolders",
    ()=>mockFolders,
    "mockMessages",
    ()=>mockMessages,
    "mockStories",
    ()=>mockStories
]);
const users = [
    {
        id: "2",
        name: "Anna",
        username: "anna",
        status: "offline",
        lastSeen: "yesterday 23:15",
        isPremium: true
    },
    {
        id: "3",
        name: "Dmitry",
        username: "dmitry_dev",
        status: "online",
        bio: "Backend developer"
    },
    {
        id: "4",
        name: "Maria",
        username: "maria_design",
        status: "offline",
        lastSeen: "today 09:30"
    },
    {
        id: "5",
        name: "Tepla Team",
        status: "offline"
    },
    {
        id: "6",
        name: "Sergey",
        username: "sergey",
        status: "offline",
        lastSeen: "2 hours ago"
    },
    {
        id: "7",
        name: "Ekaterina",
        username: "kate_qa",
        status: "online",
        isPremium: true
    },
    {
        id: "8",
        name: "Alex Bot",
        username: "alex_bot",
        status: "online"
    }
];
const mockChats = [
    {
        id: "c1",
        type: "direct",
        name: "Anna",
        user: users[0],
        lastMessage: {
            text: "Great, thanks!",
            senderId: "2",
            timestamp: "12:45",
            type: "text"
        },
        unreadCount: 2,
        isPinned: true
    },
    {
        id: "c2",
        type: "direct",
        name: "Dmitry",
        user: users[1],
        lastMessage: {
            text: "Call at 15:00, don't forget",
            senderId: "3",
            timestamp: "10:20",
            type: "text"
        },
        unreadCount: 1
    },
    {
        id: "c3",
        type: "direct",
        name: "Maria",
        user: users[2],
        lastMessage: {
            text: "Updated mockups in Figma",
            senderId: "4",
            timestamp: "yesterday",
            type: "text"
        },
        unreadCount: 0
    },
    {
        id: "c4",
        type: "group",
        name: "Tepla Team",
        membersCount: 6,
        lastMessage: {
            text: "Deploy scheduled for Friday",
            senderId: "3",
            senderName: "Dmitry",
            timestamp: "yesterday",
            type: "text"
        },
        unreadCount: 5
    },
    {
        id: "c5",
        type: "direct",
        name: "Sergey",
        user: users[4],
        lastMessage: {
            text: "Check my PR when you have time",
            senderId: "6",
            timestamp: "Mon",
            type: "text"
        },
        unreadCount: 0
    },
    {
        id: "c6",
        type: "direct",
        name: "Ekaterina",
        user: users[5],
        lastMessage: {
            text: "Fixed the notification bug",
            senderId: "7",
            timestamp: "Mon",
            type: "text"
        },
        unreadCount: 0
    },
    {
        id: "c7",
        type: "channel",
        name: "Tepla News",
        membersCount: 1240,
        lastMessage: {
            text: "v2.0 Release Announcement",
            senderId: "5",
            senderName: "Admin",
            timestamp: "today",
            type: "text"
        },
        unreadCount: 3
    },
    {
        id: "c8",
        type: "bot",
        name: "Alex Bot",
        user: users[6],
        lastMessage: {
            text: "How can I help?",
            senderId: "8",
            timestamp: "now",
            type: "text"
        },
        unreadCount: 0
    }
];
const today = "2026-03-19";
const yesterday = "2026-03-18";
const mockMessages = {
    c1: [
        {
            id: "m1",
            chatId: "c1",
            senderId: "2",
            senderName: "Anna",
            text: "Hey! How's the layout going?",
            type: "text",
            timestamp: "10:00",
            date: yesterday,
            status: "read"
        },
        {
            id: "m2",
            chatId: "c1",
            senderId: "me",
            senderName: "Ilya",
            text: "Almost done, just need to finish the theme",
            type: "text",
            timestamp: "10:05",
            date: yesterday,
            status: "read"
        },
        {
            id: "m3",
            chatId: "c1",
            senderId: "2",
            senderName: "Anna",
            text: "Cool. I checked the mockups, looks great!",
            type: "text",
            timestamp: "10:10",
            date: yesterday,
            status: "read",
            reactions: [
                {
                    emoji: "\u{1F44D}",
                    count: 2,
                    users: [
                        "me",
                        "2"
                    ],
                    myReaction: true
                }
            ]
        },
        {
            id: "m4",
            chatId: "c1",
            senderId: "me",
            senderName: "Ilya",
            text: "Dark theme is default, right?",
            type: "text",
            timestamp: "12:00",
            date: today,
            status: "read"
        },
        {
            id: "m5",
            chatId: "c1",
            senderId: "2",
            senderName: "Anna",
            text: "Yes, dark by default. But light is needed too",
            type: "text",
            timestamp: "12:10",
            date: today,
            status: "read"
        },
        {
            id: "m6",
            chatId: "c1",
            senderId: "me",
            senderName: "Ilya",
            text: "Got it, I'll add a toggle",
            type: "text",
            timestamp: "12:15",
            date: today,
            status: "read"
        },
        {
            id: "m7",
            chatId: "c1",
            senderId: "2",
            senderName: "Anna",
            text: "By the way, accent color should be sky blue like in the mockup",
            type: "text",
            timestamp: "12:30",
            date: today,
            status: "read"
        },
        {
            id: "m8",
            chatId: "c1",
            senderId: "me",
            senderName: "Ilya",
            text: "Already using sky for accent!",
            type: "text",
            timestamp: "12:35",
            date: today,
            status: "delivered"
        },
        {
            id: "m9",
            chatId: "c1",
            senderId: "2",
            senderName: "Anna",
            text: "Great, thanks!",
            type: "text",
            timestamp: "12:45",
            date: today,
            status: "read",
            reactions: [
                {
                    emoji: "\u{2764}\u{FE0F}",
                    count: 1,
                    users: [
                        "me"
                    ],
                    myReaction: true
                }
            ]
        }
    ],
    c2: [
        {
            id: "m20",
            chatId: "c2",
            senderId: "3",
            senderName: "Dmitry",
            text: "Hey, seen the new design?",
            type: "text",
            timestamp: "14:00",
            date: yesterday,
            status: "read"
        },
        {
            id: "m21",
            chatId: "c2",
            senderId: "me",
            senderName: "Ilya",
            text: "Yeah, looks awesome! Maria did great",
            type: "text",
            timestamp: "14:05",
            date: yesterday,
            status: "read"
        },
        {
            id: "m22",
            chatId: "c2",
            senderId: "3",
            senderName: "Dmitry",
            text: "Agreed. Need to discuss some architecture points",
            type: "text",
            timestamp: "14:10",
            date: yesterday,
            status: "read"
        },
        {
            id: "m23",
            chatId: "c2",
            senderId: "3",
            senderName: "Dmitry",
            text: "Call at 15:00, don't forget",
            type: "text",
            timestamp: "10:20",
            date: today,
            status: "read"
        }
    ],
    c4: [
        {
            id: "m40",
            chatId: "c4",
            senderId: "3",
            senderName: "Dmitry",
            text: "Hi everyone! Updated the sprint plan",
            type: "text",
            timestamp: "09:00",
            date: yesterday,
            status: "read"
        },
        {
            id: "m41",
            chatId: "c4",
            senderId: "4",
            senderName: "Maria",
            text: "Ok, will check",
            type: "text",
            timestamp: "09:15",
            date: yesterday,
            status: "read"
        },
        {
            id: "m42",
            chatId: "c4",
            senderId: "me",
            senderName: "Ilya",
            text: "Frontend on schedule, will finish layout by Wednesday",
            type: "text",
            timestamp: "09:30",
            date: yesterday,
            status: "read"
        },
        {
            id: "m43",
            chatId: "c4",
            senderId: "6",
            senderName: "Sergey",
            text: "Backend also on track. Auth API is ready",
            type: "text",
            timestamp: "10:00",
            date: yesterday,
            status: "read"
        },
        {
            id: "m44",
            chatId: "c4",
            senderId: "3",
            senderName: "Dmitry",
            text: "Deploy scheduled for Friday",
            type: "text",
            timestamp: "15:00",
            date: today,
            status: "read",
            isPinned: true,
            reactions: [
                {
                    emoji: "\u{1F680}",
                    count: 4,
                    users: [
                        "me",
                        "3",
                        "4",
                        "7"
                    ],
                    myReaction: true
                }
            ]
        }
    ]
};
const mockFolders = [
    {
        id: "f1",
        name: "Work",
        icon: "\u{1F4BC}",
        chatIds: [
            "c1",
            "c2",
            "c3",
            "c4",
            "c5",
            "c6"
        ],
        color: "#0ea5e9"
    },
    {
        id: "f2",
        name: "Channels",
        icon: "\u{1F4E2}",
        chatIds: [
            "c7"
        ],
        color: "#f59e0b"
    },
    {
        id: "f3",
        name: "Bots",
        icon: "\u{1F916}",
        chatIds: [
            "c8"
        ],
        color: "#8b5cf6"
    }
];
const mockStories = [
    {
        userId: "me",
        userName: "My Story",
        stories: [
            {
                id: "s0",
                userId: "me",
                userName: "Ilya",
                type: "text",
                text: "Working on Tepla 2.0!",
                backgroundColor: "#0ea5e9",
                createdAt: today,
                expiresAt: "2026-03-20",
                viewsCount: 12,
                isViewed: true
            }
        ],
        hasUnviewed: false
    },
    {
        userId: "2",
        userName: "Anna",
        userAvatar: undefined,
        stories: [
            {
                id: "s1",
                userId: "2",
                userName: "Anna",
                type: "text",
                text: "New design ready!",
                backgroundColor: "#8b5cf6",
                createdAt: today,
                expiresAt: "2026-03-20",
                viewsCount: 45,
                isViewed: false
            }
        ],
        hasUnviewed: true
    },
    {
        userId: "7",
        userName: "Ekaterina",
        stories: [
            {
                id: "s2",
                userId: "7",
                userName: "Ekaterina",
                type: "text",
                text: "QA complete!",
                backgroundColor: "#10b981",
                createdAt: today,
                expiresAt: "2026-03-20",
                viewsCount: 30,
                isViewed: false
            }
        ],
        hasUnviewed: true
    },
    {
        userId: "3",
        userName: "Dmitry",
        stories: [
            {
                id: "s3",
                userId: "3",
                userName: "Dmitry",
                type: "text",
                text: "Backend v2 is live",
                backgroundColor: "#ef4444",
                createdAt: today,
                expiresAt: "2026-03-20",
                viewsCount: 67,
                isViewed: true
            }
        ],
        hasUnviewed: false
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useChatStore",
    ()=>useChatStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/mock-data.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/socket.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/auth-store.ts [app-client] (ecmascript)");
"use client";
;
;
;
;
;
// ─── Backend → Frontend mappers ─────────────────────────
function mapBackendChat(raw) {
    return {
        id: raw.id,
        type: raw.type || "direct",
        name: raw.name || raw.display_name || "Chat",
        avatar: raw.avatar_url,
        description: raw.description,
        unreadCount: raw.unread_count || 0,
        isPinned: raw.is_pinned || false,
        isMuted: raw.is_muted || false,
        isArchived: raw.is_archived || false,
        membersCount: raw.members_count,
        lastMessage: raw.last_message ? {
            text: raw.last_message.content || raw.last_message.text || "",
            senderId: raw.last_message.sender_id || raw.last_message.senderId || "",
            timestamp: formatTime(raw.last_message.created_at || raw.last_message.timestamp),
            type: raw.last_message.type || "text"
        } : undefined,
        user: raw.other_user ? {
            id: raw.other_user.id,
            name: raw.other_user.display_name || raw.other_user.username || "User",
            username: raw.other_user.username,
            avatar: raw.other_user.avatar_url,
            status: raw.other_user.is_online ? "online" : "offline",
            lastSeen: raw.other_user.last_seen
        } : undefined
    };
}
function mapBackendMessage(raw) {
    return {
        id: raw.id,
        chatId: raw.chat_id || raw.chatId,
        senderId: raw.sender_id || raw.senderId,
        senderName: raw.sender_name || raw.senderName,
        text: raw.content || raw.text || "",
        type: raw.type || "text",
        timestamp: formatTime(raw.created_at || raw.createdAt || raw.timestamp),
        date: formatDate(raw.created_at || raw.createdAt || raw.timestamp),
        status: raw.status || "sent",
        isEdited: raw.is_edited || false,
        isPinned: raw.is_pinned || false,
        replyTo: raw.reply_to ? {
            id: raw.reply_to.id,
            senderId: raw.reply_to.sender_id,
            senderName: raw.reply_to.sender_name || "",
            text: raw.reply_to.content || "",
            type: raw.reply_to.type || "text"
        } : undefined,
        reactions: raw.reactions?.map((r)=>({
                emoji: r.emoji,
                count: r.count || 1,
                users: r.users || [
                    r.user_id
                ],
                myReaction: r.my_reaction || false
            })),
        attachments: raw.attachments?.map((a)=>({
                id: a.id,
                type: a.type,
                url: a.url || a.file_url,
                thumbnailUrl: a.thumbnail_url,
                fileName: a.file_name,
                fileSize: a.file_size,
                mimeType: a.mime_type,
                duration: a.duration,
                width: a.width,
                height: a.height
            }))
    };
}
function formatTime(iso) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch  {
        return "";
    }
}
function formatDate(iso) {
    if (!iso) return new Date().toISOString().split("T")[0];
    try {
        return new Date(iso).toISOString().split("T")[0];
    } catch  {
        return "";
    }
}
// ─── Store ──────────────────────────────────────────────
let pendingMessages = new Set(); // clientMessageIds to deduplicate socket echos
const useChatStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        chats: [],
        messages: {},
        activeChatId: null,
        activeThreadId: null,
        folders: __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockFolders"],
        activeFolderId: null,
        stories: __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockStories"],
        searchQuery: "",
        replyingTo: null,
        editingMessage: null,
        showProfile: false,
        showStickers: false,
        showCalls: false,
        showSettings: false,
        showPremium: false,
        showThread: false,
        _socketBound: false,
        // ─── Load chats from API ────────────────────────
        loadChats: async ()=>{
            try {
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("/chats");
                const chats = res.data.map(mapBackendChat);
                set({
                    chats
                });
            } catch (err) {
                // Warn instead of error to avoid triggering Next.js dev error overlay
                console.warn("[chat-store] loadChats failed:", err?.message || err);
            }
        },
        // ─── Load messages for a chat ───────────────────
        loadMessages: async (chatId)=>{
            // Don't re-fetch if we already have messages
            if (get().messages[chatId]?.length) return;
            try {
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`/messages?chatId=${chatId}&limit=50`);
                const messages = res.data.map(mapBackendMessage);
                set((s)=>({
                        messages: {
                            ...s.messages,
                            [chatId]: messages
                        }
                    }));
            } catch (err) {
                console.warn("[chat-store] loadMessages failed:", err?.message || err);
            }
        },
        // ─── Bind socket events ────────────────────────
        bindSocket: ()=>{
            if (get()._socketBound) return;
            const socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSocket"])();
            if (!socket) return;
            set({
                _socketBound: true
            });
            // New message from another user (or echo of own)
            socket.on("message:new", (data)=>{
                const msg = mapBackendMessage({
                    ...data.message,
                    chat_id: data.chatId
                });
                const myId = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"].getState().user?.id;
                // Deduplicate own messages that were optimistically added
                if (pendingMessages.has(msg.id)) {
                    pendingMessages.delete(msg.id);
                    // Update status from "sending" to "sent"
                    set((s)=>({
                            messages: {
                                ...s.messages,
                                [data.chatId]: (s.messages[data.chatId] || []).map((m)=>m.id === msg.id ? {
                                        ...m,
                                        status: "sent"
                                    } : m)
                            }
                        }));
                    return;
                }
                // Skip own messages that somehow weren't tracked (double safety)
                if (msg.senderId === myId && ((s)=>s.messages[data.chatId]?.some((m)=>m.text === msg.text && m.status === "sending"))(get())) {
                    return;
                }
                // Add incoming message
                set((s)=>({
                        messages: {
                            ...s.messages,
                            [data.chatId]: [
                                ...s.messages[data.chatId] || [],
                                msg
                            ]
                        },
                        chats: s.chats.map((c)=>c.id === data.chatId ? {
                                ...c,
                                lastMessage: {
                                    text: msg.text,
                                    senderId: msg.senderId,
                                    timestamp: msg.timestamp,
                                    type: msg.type
                                },
                                unreadCount: s.activeChatId === data.chatId ? 0 : (c.unreadCount || 0) + 1
                            } : c)
                    }));
                // Join room if we aren't in it yet
                socket.emit("presence:join", data.chatId);
            });
            socket.on("message:updated", (data)=>{
                set((s)=>({
                        messages: {
                            ...s.messages,
                            [data.chatId]: (s.messages[data.chatId] || []).map((m)=>m.id === data.messageId ? {
                                    ...m,
                                    text: data.content,
                                    isEdited: true
                                } : m)
                        }
                    }));
            });
            socket.on("message:deleted", (data)=>{
                set((s)=>({
                        messages: {
                            ...s.messages,
                            [data.chatId]: (s.messages[data.chatId] || []).filter((m)=>m.id !== data.messageId)
                        }
                    }));
            });
            socket.on("message:pinned", (data)=>{
                set((s)=>({
                        messages: {
                            ...s.messages,
                            [data.chatId]: (s.messages[data.chatId] || []).map((m)=>m.id === data.messageId ? {
                                    ...m,
                                    isPinned: true
                                } : m)
                        }
                    }));
            });
            socket.on("message:unpinned", (data)=>{
                set((s)=>({
                        messages: {
                            ...s.messages,
                            [data.chatId]: (s.messages[data.chatId] || []).map((m)=>m.id === data.messageId ? {
                                    ...m,
                                    isPinned: false
                                } : m)
                        }
                    }));
            });
            socket.on("message:read", (data)=>{
                const myId = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"].getState().user?.id;
                // Update status of my messages that were read by others
                if (data.readBy !== myId) {
                    set((s)=>({
                            messages: {
                                ...s.messages,
                                [data.chatId]: (s.messages[data.chatId] || []).map((m)=>data.messageIds.includes(m.id) && m.senderId === myId ? {
                                        ...m,
                                        status: "read"
                                    } : m)
                            }
                        }));
                }
            });
            socket.on("message:delivered", (data)=>{
                const myId = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"].getState().user?.id;
                if (data.deliveredTo !== myId) {
                    set((s)=>({
                            messages: {
                                ...s.messages,
                                [data.chatId]: (s.messages[data.chatId] || []).map((m)=>data.messageIds.includes(m.id) && m.senderId === myId && m.status !== "read" ? {
                                        ...m,
                                        status: "delivered"
                                    } : m)
                            }
                        }));
                }
            });
            socket.on("typing", (data)=>{
                set((s)=>({
                        chats: s.chats.map((c)=>c.id === data.chatId ? {
                                ...c,
                                typing: [
                                    ...new Set([
                                        ...c.typing || [],
                                        data.userId
                                    ])
                                ]
                            } : c)
                    }));
                // Clear typing after 3s
                setTimeout(()=>{
                    set((s)=>({
                            chats: s.chats.map((c)=>c.id === data.chatId ? {
                                    ...c,
                                    typing: (c.typing || []).filter((u)=>u !== data.userId)
                                } : c)
                        }));
                }, 3000);
            });
            socket.on("chats:updated", ()=>{
                get().loadChats();
            });
        },
        setActiveChat: (chatId)=>{
            set({
                activeChatId: chatId,
                showProfile: false,
                showThread: false,
                replyingTo: null,
                editingMessage: null
            });
            if (chatId) {
                get().markAsRead(chatId);
                get().loadMessages(chatId);
                // Join the chat room for real-time events
                const socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSocket"])();
                if (socket) socket.emit("presence:join", chatId);
            }
        },
        setActiveFolder: (folderId)=>set({
                activeFolderId: folderId
            }),
        setSearchQuery: (q)=>set({
                searchQuery: q
            }),
        setReplyingTo: (msg)=>set({
                replyingTo: msg,
                editingMessage: null
            }),
        setEditingMessage: (msg)=>set({
                editingMessage: msg,
                replyingTo: null
            }),
        toggleProfile: ()=>set((s)=>({
                    showProfile: !s.showProfile
                })),
        toggleStickers: ()=>set((s)=>({
                    showStickers: !s.showStickers
                })),
        toggleCalls: ()=>set((s)=>({
                    showCalls: !s.showCalls
                })),
        toggleSettings: ()=>set((s)=>({
                    showSettings: !s.showSettings
                })),
        togglePremium: ()=>set((s)=>({
                    showPremium: !s.showPremium
                })),
        toggleThread: ()=>set((s)=>({
                    showThread: !s.showThread
                })),
        // ─── Send message via API ──────────────────────
        sendMessage: (chatId, text, type = "text")=>{
            const now = new Date();
            const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const replyingTo = get().replyingTo;
            const authUser = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"].getState().user;
            const currentUserId = authUser?.id || "me";
            // Optimistic add
            const optimistic = {
                id: tempId,
                chatId,
                senderId: currentUserId,
                senderName: authUser?.name || "",
                text,
                type: type,
                timestamp: now.toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit"
                }),
                date: now.toISOString().split("T")[0],
                status: "sending",
                replyTo: replyingTo ? {
                    id: replyingTo.id,
                    senderId: replyingTo.senderId,
                    senderName: replyingTo.senderName || "",
                    text: replyingTo.text,
                    type: replyingTo.type
                } : undefined
            };
            set((s)=>({
                    messages: {
                        ...s.messages,
                        [chatId]: [
                            ...s.messages[chatId] || [],
                            optimistic
                        ]
                    },
                    chats: s.chats.map((c)=>c.id === chatId ? {
                            ...c,
                            lastMessage: {
                                text,
                                senderId: currentUserId,
                                timestamp: optimistic.timestamp,
                                type: optimistic.type
                            },
                            unreadCount: 0
                        } : c),
                    replyingTo: null,
                    editingMessage: null
                }));
            // Send to API
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("/messages", {
                chatId,
                content: text,
                type,
                replyToId: replyingTo?.id || undefined
            }).then((res)=>{
                const real = res.data;
                // Track server ID so socket echo is deduplicated
                pendingMessages.add(real.id);
                // Replace temp message with real one
                set((s)=>({
                        messages: {
                            ...s.messages,
                            [chatId]: (s.messages[chatId] || []).map((m)=>m.id === tempId ? {
                                    ...m,
                                    id: real.id,
                                    status: "sent"
                                } : m)
                        }
                    }));
            }).catch((err)=>{
                console.warn("[chat-store] sendMessage failed:", err);
                // Mark as failed
                set((s)=>({
                        messages: {
                            ...s.messages,
                            [chatId]: (s.messages[chatId] || []).map((m)=>m.id === tempId ? {
                                    ...m,
                                    status: "failed"
                                } : m)
                        }
                    }));
            });
        },
        addReaction: (chatId, messageId, emoji)=>{
            set((s)=>({
                    messages: {
                        ...s.messages,
                        [chatId]: (s.messages[chatId] || []).map((m)=>{
                            if (m.id !== messageId) return m;
                            const reactions = [
                                ...m.reactions || []
                            ];
                            const existing = reactions.find((r)=>r.emoji === emoji);
                            if (existing) {
                                if (existing.myReaction) {
                                    existing.count--;
                                    existing.myReaction = false;
                                    existing.users = existing.users.filter((u)=>u !== "me");
                                } else {
                                    existing.count++;
                                    existing.myReaction = true;
                                    existing.users.push("me");
                                }
                            } else {
                                reactions.push({
                                    emoji,
                                    count: 1,
                                    users: [
                                        "me"
                                    ],
                                    myReaction: true
                                });
                            }
                            return {
                                ...m,
                                reactions: reactions.filter((r)=>r.count > 0)
                            };
                        })
                    }
                }));
        },
        markAsRead: (chatId)=>{
            set((s)=>({
                    chats: s.chats.map((c)=>c.id === chatId ? {
                            ...c,
                            unreadCount: 0
                        } : c)
                }));
            // Notify server
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("/messages/read", {
                chatId
            }).catch((err)=>console.warn("[chat-store] markAsRead failed:", err));
        },
        forwardMessage: (messageId, toChatId)=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("/messages/forward", {
                messageId,
                toChatId
            }).then(()=>{
            // Message will arrive via socket event
            }).catch((err)=>console.warn("[chat-store] forwardMessage failed:", err));
        },
        pinMessage: (chatId, messageId)=>{
            // Optimistic toggle
            set((s)=>({
                    messages: {
                        ...s.messages,
                        [chatId]: (s.messages[chatId] || []).map((m)=>m.id === messageId ? {
                                ...m,
                                isPinned: !m.isPinned
                            } : m)
                    }
                }));
            // API call
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].patch(`/messages/${messageId}/pin`).catch((err)=>console.warn("[chat-store] pinMessage failed:", err));
        },
        deleteMessage: (chatId, messageId)=>{
            // Optimistic remove
            set((s)=>({
                    messages: {
                        ...s.messages,
                        [chatId]: (s.messages[chatId] || []).filter((m)=>m.id !== messageId)
                    }
                }));
            // API call
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].delete(`/messages/${messageId}`).catch((err)=>console.warn("[chat-store] deleteMessage failed:", err));
        },
        toggleTranslation: (chatId)=>{
            set((s)=>({
                    chats: s.chats.map((c)=>c.id === chatId ? {
                            ...c,
                            autoTranslate: !c.autoTranslate
                        } : c)
                }));
        },
        viewStory: (storyId)=>{
            set((s)=>({
                    stories: s.stories.map((us)=>({
                            ...us,
                            stories: us.stories.map((st)=>st.id === storyId ? {
                                    ...st,
                                    isViewed: true,
                                    viewsCount: st.viewsCount + 1
                                } : st),
                            hasUnviewed: us.stories.some((st)=>st.id !== storyId && !st.isViewed)
                        }))
                }));
        },
        // ─── Draft Messages (localStorage only) ─────
        getDraft: (chatId)=>{
            try {
                return localStorage.getItem(`tepla-draft:${chatId}`) || "";
            } catch  {
                return "";
            }
        },
        setDraft: (chatId, text)=>{
            try {
                if (text.trim()) {
                    localStorage.setItem(`tepla-draft:${chatId}`, text);
                } else {
                    localStorage.removeItem(`tepla-draft:${chatId}`);
                }
            } catch  {}
        }
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/lib/socket.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "connectSocket",
    ()=>connectSocket,
    "disconnectSocket",
    ()=>disconnectSocket,
    "getSocket",
    ()=>getSocket
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/client/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/client/node_modules/socket.io-client/build/esm/index.js [app-client] (ecmascript) <locals>");
;
const WS_URL = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_WS_URL || "http://localhost:3100";
let socket = null;
function connectSocket(token) {
    if (socket?.connected) return socket;
    socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])(WS_URL, {
        auth: {
            token
        },
        transports: [
            "websocket",
            "polling"
        ],
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
    });
    socket.on("connect", ()=>{
        console.log("[ws] connected");
        // Re-join all chat rooms on reconnect
        try {
            const { useChatStore } = __turbopack_context__.r("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
            const chats = useChatStore.getState().chats;
            chats.forEach((c)=>socket.emit("presence:join", c.id));
        } catch  {}
    });
    socket.on("disconnect", (reason)=>console.log("[ws] disconnected:", reason));
    // Listen for real-time user profile updates (username changes, etc.)
    socket.on("user:updated", (payload)=>{
        console.log("[ws] user:updated", payload);
    });
    socket.on("user:profile_changed", (payload)=>{
        console.log("[ws] user:profile_changed", payload);
    });
    return socket;
}
function getSocket() {
    return socket;
}
function disconnectSocket() {
    socket?.disconnect();
    socket = null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/stores/auth-store.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAuthStore",
    ()=>useAuthStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/socket.ts [app-client] (ecmascript)");
"use client";
;
;
;
function persist(user, token, language) {
    localStorage.setItem("tepla-auth", JSON.stringify({
        user,
        token,
        language
    }));
}
const useAuthStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        user: null,
        token: null,
        isLoading: true,
        language: "ru",
        hydrate: ()=>{
            const stored = localStorage.getItem("tepla-auth");
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    if (data.token && data.user) {
                        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].setToken(data.token);
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["connectSocket"])(data.token);
                        set({
                            user: data.user,
                            token: data.token,
                            language: data.language || "ru",
                            isLoading: false
                        });
                        return;
                    }
                } catch  {}
            }
            set({
                isLoading: false
            });
        },
        login: async (email, password)=>{
            set({
                isLoading: true
            });
            try {
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("/auth/login", {
                    email,
                    password
                });
                const { tokens: { accessToken }, user: raw } = res.data;
                const user = {
                    id: raw.id,
                    name: raw.displayName || raw.username || email.split("@")[0],
                    username: raw.username,
                    avatar: raw.avatarUrl,
                    phone: raw.phone,
                    status: "online",
                    isPremium: raw.isPremium || false,
                    language: raw.language || get().language
                };
                __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].setToken(accessToken);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["connectSocket"])(accessToken);
                persist(user, accessToken, user.language || get().language);
                set({
                    user,
                    token: accessToken,
                    isLoading: false
                });
                return true;
            } catch (err) {
                console.warn("[auth] login failed:", err);
                set({
                    isLoading: false
                });
                return false;
            }
        },
        register: async (name, email, password, language, username)=>{
            set({
                isLoading: true
            });
            try {
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("/auth/register/email", {
                    email,
                    password,
                    username,
                    displayName: name,
                    language
                });
                const { tokens: { accessToken }, user: raw } = res.data;
                const user = {
                    id: raw.id,
                    name: raw.displayName || name,
                    username: raw.username || username,
                    status: "online",
                    language: raw.language || language,
                    phone: raw.phone
                };
                __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].setToken(accessToken);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["connectSocket"])(accessToken);
                persist(user, accessToken, language);
                set({
                    user,
                    token: accessToken,
                    isLoading: false,
                    language
                });
                return true;
            } catch (err) {
                console.warn("[auth] register failed:", err);
                set({
                    isLoading: false
                });
                return false;
            }
        },
        logout: ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].setToken(null);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["disconnectSocket"])();
            localStorage.removeItem("tepla-auth");
            set({
                user: null,
                token: null
            });
        },
        setLanguage: (lang)=>{
            set({
                language: lang
            });
            const stored = localStorage.getItem("tepla-auth");
            if (stored) {
                const data = JSON.parse(stored);
                data.language = lang;
                localStorage.setItem("tepla-auth", JSON.stringify(data));
            }
        },
        setUsername: (username)=>{
            const { user, token } = get();
            if (!user) return;
            // Fire-and-forget API call to update username on server
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].patch("/users/" + user.id, {
                username
            }).catch((err)=>console.warn("[auth] username update failed:", err));
            const updated = {
                ...user,
                username
            };
            set({
                user: updated
            });
            const stored = localStorage.getItem("tepla-auth");
            if (stored) {
                const data = JSON.parse(stored);
                data.user = updated;
                localStorage.setItem("tepla-auth", JSON.stringify(data));
            }
        }
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/ui/Avatar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Avatar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
const sizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl"
};
const statusDots = {
    xs: "w-1.5 h-1.5 ring-1",
    sm: "w-2 h-2 ring-[1.5px]",
    md: "w-2.5 h-2.5 ring-2",
    lg: "w-3 h-3 ring-2",
    xl: "w-3.5 h-3.5 ring-2"
};
const colors = [
    "bg-sky-600",
    "bg-emerald-600",
    "bg-violet-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-teal-600",
    "bg-indigo-600",
    "bg-pink-600"
];
function hashColor(name) {
    let h = 0;
    for(let i = 0; i < name.length; i++)h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
}
const statusColors = {
    online: "bg-emerald-400",
    offline: "bg-gray-400",
    away: "bg-amber-400",
    dnd: "bg-red-400"
};
function Avatar({ name, src, status, size = "md", isPremium, showStatus = true, onClick, storyRing, storyViewed }) {
    const initial = name.charAt(0).toUpperCase();
    const ringClass = storyRing ? storyViewed ? "ring-2 ring-[var(--text-tertiary)] ring-offset-2 ring-offset-[var(--bg-sidebar)]" : "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-sidebar)]" : "";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `relative inline-flex shrink-0 ${onClick ? "cursor-pointer" : ""}`,
        onClick: onClick,
        children: [
            src ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                src: src,
                alt: name,
                className: `${sizes[size]} rounded-full object-cover ${ringClass}`
            }, void 0, false, {
                fileName: "[project]/client/src/components/ui/Avatar.tsx",
                lineNumber: 52,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `${sizes[size]} ${hashColor(name)} flex items-center justify-center rounded-full font-semibold text-white ${ringClass}`,
                children: initial
            }, void 0, false, {
                fileName: "[project]/client/src/components/ui/Avatar.tsx",
                lineNumber: 54,
                columnNumber: 9
            }, this),
            showStatus && status && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: `absolute right-0 bottom-0 block ${statusDots[size]} rounded-full ring-[var(--bg-sidebar)] ${statusColors[status]}`
            }, void 0, false, {
                fileName: "[project]/client/src/components/ui/Avatar.tsx",
                lineNumber: 59,
                columnNumber: 9
            }, this),
            isPremium && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white",
                children: "S"
            }, void 0, false, {
                fileName: "[project]/client/src/components/ui/Avatar.tsx",
                lineNumber: 62,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/ui/Avatar.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
_c = Avatar;
var _c;
__turbopack_context__.k.register(_c, "Avatar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/ui/IconButton.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>IconButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
const variants = {
    ghost: "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
    filled: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
    danger: "text-red-400 hover:bg-red-500/10"
};
const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5"
};
function IconButton({ label, children, variant = "ghost", size = "md", badge, className = "", ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        "aria-label": label,
        className: `relative flex items-center justify-center rounded-lg transition-colors ${variants[variant]} ${sizeClasses[size]} ${className}`,
        ...props,
        children: [
            children,
            badge !== undefined && badge > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white",
                children: badge > 99 ? "99+" : badge
            }, void 0, false, {
                fileName: "[project]/client/src/components/ui/IconButton.tsx",
                lineNumber: 25,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/ui/IconButton.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_c = IconButton;
var _c;
__turbopack_context__.k.register(_c, "IconButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/ui/Modal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Modal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    full: "max-w-[90vw] max-h-[90vh]"
};
function Modal({ open, onClose, title, children, size = "md" }) {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Modal.useEffect": ()=>{
            if (!open) return;
            const handler = {
                "Modal.useEffect.handler": (e)=>{
                    if (e.key === "Escape") onClose();
                }
            }["Modal.useEffect.handler"];
            window.addEventListener("keydown", handler);
            return ({
                "Modal.useEffect": ()=>window.removeEventListener("keydown", handler)
            })["Modal.useEffect"];
        }
    }["Modal.useEffect"], [
        open,
        onClose
    ]);
    if (!open) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center animate-fade-in",
        onClick: onClose,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 bg-[var(--bg-overlay)]"
            }, void 0, false, {
                fileName: "[project]/client/src/components/ui/Modal.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `relative ${sizeClasses[size]} w-full rounded-2xl bg-[var(--bg-card)] p-6 shadow-xl animate-scale-in`,
                onClick: (e)=>e.stopPropagation(),
                children: [
                    title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-4 flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-lg font-semibold text-[var(--text-primary)]",
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/ui/Modal.tsx",
                                lineNumber: 35,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: onClose,
                                className: "rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "20",
                                    height: "20",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M18 6L6 18M6 6l12 12"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/ui/Modal.tsx",
                                        lineNumber: 37,
                                        columnNumber: 113
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/ui/Modal.tsx",
                                    lineNumber: 37,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/ui/Modal.tsx",
                                lineNumber: 36,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/ui/Modal.tsx",
                        lineNumber: 34,
                        columnNumber: 11
                    }, this),
                    children
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/ui/Modal.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/ui/Modal.tsx",
        lineNumber: 30,
        columnNumber: 5
    }, this);
}
_s(Modal, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = Modal;
var _c;
__turbopack_context__.k.register(_c, "Modal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/stories/StoriesBar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>StoriesBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/Avatar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Modal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/Modal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function StoriesBar({ stories }) {
    _s();
    const [viewingStory, setViewingStory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [storyIndex, setStoryIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const viewStory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "StoriesBar.useChatStore[viewStory]": (s)=>s.viewStory
    }["StoriesBar.useChatStore[viewStory]"]);
    const openStory = (us)=>{
        setViewingStory(us);
        setStoryIndex(0);
        if (us.stories[0] && !us.stories[0].isViewed) viewStory(us.stories[0].id);
    };
    const nextStory = ()=>{
        if (!viewingStory) return;
        if (storyIndex < viewingStory.stories.length - 1) {
            const nextIdx = storyIndex + 1;
            setStoryIndex(nextIdx);
            if (!viewingStory.stories[nextIdx].isViewed) viewStory(viewingStory.stories[nextIdx].id);
        } else {
            const currentUserIdx = stories.findIndex((s)=>s.userId === viewingStory.userId);
            if (currentUserIdx < stories.length - 1) {
                const nextUser = stories[currentUserIdx + 1];
                setViewingStory(nextUser);
                setStoryIndex(0);
                if (!nextUser.stories[0].isViewed) viewStory(nextUser.stories[0].id);
            } else {
                setViewingStory(null);
            }
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-3 overflow-x-auto px-3 py-3 scrollbar-none",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "flex shrink-0 flex-col items-center gap-1",
                        onClick: ()=>openStory(stories[0]),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        name: stories[0]?.userName || "+",
                                        size: "lg",
                                        showStatus: false
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                        lineNumber: 46,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-bold text-white ring-2 ring-[var(--bg-sidebar)]",
                                        children: "+"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                        lineNumber: 47,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                lineNumber: 45,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "max-w-[56px] truncate text-[10px] text-[var(--text-tertiary)]",
                                children: "My"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                lineNumber: 49,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this),
                    stories.filter((s)=>s.userId !== "me").map((us)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "flex shrink-0 flex-col items-center gap-1",
                            onClick: ()=>openStory(us),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    name: us.userName,
                                    src: us.userAvatar,
                                    size: "lg",
                                    showStatus: false,
                                    storyRing: true,
                                    storyViewed: !us.hasUnviewed
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                    lineNumber: 54,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "max-w-[56px] truncate text-[10px] text-[var(--text-tertiary)]",
                                    children: us.userName
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                    lineNumber: 55,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, us.userId, true, {
                            fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                            lineNumber: 53,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Modal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                open: !!viewingStory,
                onClose: ()=>setViewingStory(null),
                size: "sm",
                children: viewingStory && viewingStory.stories[storyIndex] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col items-center",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-4 flex w-full gap-1",
                            children: viewingStory.stories.map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-0.5 flex-1 rounded-full bg-white/20",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `h-full rounded-full bg-white transition-all ${i <= storyIndex ? "w-full" : "w-0"}`
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                        lineNumber: 68,
                                        columnNumber: 19
                                    }, this)
                                }, i, false, {
                                    fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                    lineNumber: 67,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                            lineNumber: 65,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-3 flex items-center gap-2 self-start",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    name: viewingStory.userName,
                                    size: "sm",
                                    showStatus: false
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                    lineNumber: 73,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-sm font-medium",
                                    children: viewingStory.userName
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                    lineNumber: 74,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-[var(--text-tertiary)]",
                                    children: viewingStory.stories[storyIndex].createdAt
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                    lineNumber: 75,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                            lineNumber: 72,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex h-[400px] w-full items-center justify-center rounded-xl text-xl font-bold text-white cursor-pointer",
                            style: {
                                background: viewingStory.stories[storyIndex].backgroundColor || "#0ea5e9"
                            },
                            onClick: nextStory,
                            children: viewingStory.stories[storyIndex].text
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                            lineNumber: 77,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-3 flex items-center gap-2 text-sm text-[var(--text-tertiary)]",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "16",
                                    height: "16",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                            lineNumber: 85,
                                            columnNumber: 113
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                            cx: "12",
                                            cy: "12",
                                            r: "3"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                            lineNumber: 85,
                                            columnNumber: 169
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                                    lineNumber: 85,
                                    columnNumber: 15
                                }, this),
                                viewingStory.stories[storyIndex].viewsCount
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                            lineNumber: 84,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                    lineNumber: 63,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/stories/StoriesBar.tsx",
                lineNumber: 61,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(StoriesBar, "JCy5N/ecvsMEWr+i88GZt+1+kUw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = StoriesBar;
var _c;
__turbopack_context__.k.register(_c, "StoriesBar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/hooks/useTheme.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useTheme",
    ()=>useTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
function useTheme() {
    _s();
    const [theme, setTheme] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("dark");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTheme.useEffect": ()=>{
            const saved = localStorage.getItem("tepla-theme");
            const initial = saved || "dark";
            setTheme(initial);
            document.documentElement.classList.toggle("dark", initial === "dark");
        }
    }["useTheme.useEffect"], []);
    const toggleTheme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTheme.useCallback[toggleTheme]": ()=>{
            setTheme({
                "useTheme.useCallback[toggleTheme]": (prev)=>{
                    const next = prev === "dark" ? "light" : "dark";
                    document.documentElement.classList.toggle("dark", next === "dark");
                    localStorage.setItem("tepla-theme", next);
                    return next;
                }
            }["useTheme.useCallback[toggleTheme]"]);
        }
    }["useTheme.useCallback[toggleTheme]"], []);
    return {
        theme,
        toggleTheme
    };
}
_s(useTheme, "yw+AFlvRTr5cMjuR4oQALIYby0A=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/chat/NewChatModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NewChatModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Modal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/Modal.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function NewChatModal({ open, onClose, initialTab = "contact" }) {
    _s();
    const [tab, setTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialTab);
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [searchResults, setSearchResults] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [searching, setSearching] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [groupName, setGroupName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [channelName, setChannelName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [channelUsername, setChannelUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [channelDesc, setChannelDesc] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [creating, setCreating] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [success, setSuccess] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NewChatModal.useEffect": ()=>{
            if (open) setTab(initialTab);
        }
    }["NewChatModal.useEffect"], [
        open,
        initialTab
    ]);
    const loadChats = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "NewChatModal.useChatStore[loadChats]": (s)=>s.loadChats
    }["NewChatModal.useChatStore[loadChats]"]);
    const setActiveChat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])({
        "NewChatModal.useChatStore[setActiveChat]": (s)=>s.setActiveChat
    }["NewChatModal.useChatStore[setActiveChat]"]);
    async function searchUsers() {
        if (search.length < 2) return;
        setSearching(true);
        setError("");
        try {
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`/users/search?q=${encodeURIComponent(search)}`);
            setSearchResults(res.data || []);
            if (!res.data?.length) setError("No users found");
        } catch  {
            setError("Search failed");
        }
        setSearching(false);
    }
    async function startDirectChat(userId) {
        setCreating(true);
        setError("");
        try {
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("/chats", {
                type: "direct",
                memberIds: [
                    userId
                ]
            });
            await loadChats();
            setActiveChat(res.data.id);
            onClose();
        } catch  {
            setError("Failed to create chat");
        }
        setCreating(false);
    }
    async function createGroup() {
        if (!groupName.trim() || groupName.trim().length < 2) {
            setError("Group name must be at least 2 characters");
            return;
        }
        setCreating(true);
        setError("");
        try {
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("/chats", {
                type: "group",
                name: groupName.trim()
            });
            await loadChats();
            setActiveChat(res.data.id);
            onClose();
        } catch  {
            setError("Failed to create group");
        }
        setCreating(false);
    }
    async function createChannel() {
        if (!channelName.trim() || channelName.trim().length < 2) {
            setError("Channel name must be at least 2 characters");
            return;
        }
        setCreating(true);
        setError("");
        try {
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post("/chats", {
                type: "channel",
                name: channelName.trim(),
                username: channelUsername.trim() || undefined,
                description: channelDesc.trim() || undefined,
                isPublic: true
            });
            await loadChats();
            setActiveChat(res.data.id);
            onClose();
        } catch  {
            setError("Failed to create channel");
        }
        setCreating(false);
    }
    function reset() {
        setSearch("");
        setSearchResults([]);
        setGroupName("");
        setChannelName("");
        setChannelUsername("");
        setChannelDesc("");
        setError("");
        setSuccess("");
    }
    function handleClose() {
        reset();
        onClose();
    }
    const tabs = [
        {
            id: "contact",
            label: "New Chat",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 127,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "12",
                        cy: "7",
                        r: "4"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 127,
                        columnNumber: 164
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                lineNumber: 127,
                columnNumber: 13
            }, this)
        },
        {
            id: "group",
            label: "Group",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 132,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "9",
                        cy: "7",
                        r: "4"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 132,
                        columnNumber: 164
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M23 21v-2a4 4 0 0 0-3-3.87"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 132,
                        columnNumber: 193
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M16 3.13a4 4 0 0 1 0 7.75"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 132,
                        columnNumber: 231
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                lineNumber: 132,
                columnNumber: 13
            }, this)
        },
        {
            id: "channel",
            label: "Channel",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M22 2L11 13"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 137,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                        points: "22 2 15 22 11 13 2 9 22 2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 137,
                        columnNumber: 134
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                lineNumber: 137,
                columnNumber: 13
            }, this)
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Modal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        open: open,
        onClose: handleClose,
        title: "Create",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-1 rounded-xl bg-[var(--bg-input)] p-1 mb-4",
                children: tabs.map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>{
                            setTab(t.id);
                            setError("");
                            setSuccess("");
                        },
                        className: `flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${tab === t.id ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`,
                        children: [
                            t.icon,
                            t.label
                        ]
                    }, t.id, true, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 146,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                lineNumber: 144,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400",
                children: error
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                lineNumber: 157,
                columnNumber: 17
            }, this),
            success && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-400",
                children: success
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                lineNumber: 158,
                columnNumber: 19
            }, this),
            tab === "contact" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-[var(--text-tertiary)]",
                        children: "Find user by username or name"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 163,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "@username or name...",
                                value: search,
                                onChange: (e)=>setSearch(e.target.value),
                                onKeyDown: (e)=>e.key === "Enter" && searchUsers(),
                                className: "flex-1 rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                lineNumber: 165,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: searchUsers,
                                disabled: searching || search.length < 2,
                                className: "rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50",
                                children: searching ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                    lineNumber: 178,
                                    columnNumber: 28
                                }, this) : "Search"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                lineNumber: 173,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 164,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "max-h-60 overflow-y-auto",
                        children: searchResults.map((u)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>startDirectChat(u.id),
                                disabled: creating,
                                className: "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white",
                                        children: (u.display_name || u.username || "?")[0].toUpperCase()
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                        lineNumber: 190,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "min-w-0 flex-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "truncate text-sm font-medium",
                                                children: u.display_name || u.username
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                                lineNumber: 194,
                                                columnNumber: 19
                                            }, this),
                                            u.username && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "truncate text-xs text-[var(--text-tertiary)]",
                                                children: [
                                                    "@",
                                                    u.username
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                                lineNumber: 195,
                                                columnNumber: 34
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                        lineNumber: 193,
                                        columnNumber: 17
                                    }, this),
                                    u.is_online && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-2 w-2 rounded-full bg-emerald-400"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                        lineNumber: 197,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, u.id, true, {
                                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                lineNumber: 184,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 182,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                lineNumber: 162,
                columnNumber: 9
            }, this),
            tab === "group" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-[var(--text-tertiary)]",
                        children: "Create a group chat for your team or friends"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 207,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        placeholder: "Group name...",
                        value: groupName,
                        onChange: (e)=>setGroupName(e.target.value),
                        className: "rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 208,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: createGroup,
                        disabled: creating || !groupName.trim(),
                        className: "rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50",
                        children: creating ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                            lineNumber: 220,
                            columnNumber: 25
                        }, this) : "Create Group"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 215,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                lineNumber: 206,
                columnNumber: 9
            }, this),
            tab === "channel" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-[var(--text-tertiary)]",
                        children: "Create a public channel to broadcast messages"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 228,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        placeholder: "Channel name...",
                        value: channelName,
                        onChange: (e)=>setChannelName(e.target.value),
                        className: "rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 229,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]",
                                children: "@"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                lineNumber: 237,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "channel_link (optional)",
                                value: channelUsername,
                                onChange: (e)=>setChannelUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")),
                                className: "w-full rounded-xl bg-[var(--bg-input)] py-2.5 pl-8 pr-3 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)]"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                                lineNumber: 238,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 236,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                        placeholder: "Description (optional)",
                        value: channelDesc,
                        onChange: (e)=>setChannelDesc(e.target.value),
                        rows: 2,
                        className: "rounded-xl bg-[var(--bg-input)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--accent)] resize-none"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 246,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: createChannel,
                        disabled: creating || !channelName.trim(),
                        className: "rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50",
                        children: creating ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                            lineNumber: 258,
                            columnNumber: 25
                        }, this) : "Create Channel"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                        lineNumber: 253,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
                lineNumber: 227,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/chat/NewChatModal.tsx",
        lineNumber: 142,
        columnNumber: 5
    }, this);
}
_s(NewChatModal, "nBTG0njPYNjk0wo0sNvL9RHiKJA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = NewChatModal;
var _c;
__turbopack_context__.k.register(_c, "NewChatModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/layout/Sidebar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/Avatar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/IconButton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$stories$2f$StoriesBar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/stories/StoriesBar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$hooks$2f$useTheme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/hooks/useTheme.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$NewChatModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/chat/NewChatModal.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
function Sidebar() {
    _s();
    const { chats, activeChatId, setActiveChat, folders, activeFolderId, setActiveFolder, stories, searchQuery, setSearchQuery, toggleSettings, togglePremium } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const { theme, toggleTheme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$hooks$2f$useTheme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    const [showNewChat, setShowNewChat] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [newChatTab, setNewChatTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("contact");
    const filteredChats = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Sidebar.useMemo[filteredChats]": ()=>{
            let list = chats;
            if (activeFolderId) {
                const folder = folders.find({
                    "Sidebar.useMemo[filteredChats].folder": (f)=>f.id === activeFolderId
                }["Sidebar.useMemo[filteredChats].folder"]);
                if (folder) list = list.filter({
                    "Sidebar.useMemo[filteredChats]": (c)=>folder.chatIds.includes(c.id)
                }["Sidebar.useMemo[filteredChats]"]);
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                list = list.filter({
                    "Sidebar.useMemo[filteredChats]": (c)=>c.name.toLowerCase().includes(q) || c.lastMessage?.text.toLowerCase().includes(q) || c.user?.username && c.user.username.toLowerCase().includes(q)
                }["Sidebar.useMemo[filteredChats]"]);
            }
            return list.sort({
                "Sidebar.useMemo[filteredChats]": (a, b)=>{
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return 0;
                }
            }["Sidebar.useMemo[filteredChats]"]);
        }
    }["Sidebar.useMemo[filteredChats]"], [
        chats,
        activeFolderId,
        folders,
        searchQuery
    ]);
    const chatTypeIcon = (chat)=>{
        if (chat.type === "group") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            width: "12",
            height: "12",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 35,
                    columnNumber: 137
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "9",
                    cy: "7",
                    r: "4"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 35,
                    columnNumber: 190
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M23 21v-2a4 4 0 0 0-3-3.87"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 35,
                    columnNumber: 219
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M16 3.13a4 4 0 0 1 0 7.75"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 35,
                    columnNumber: 257
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
            lineNumber: 35,
            columnNumber: 39
        }, this);
        if (chat.type === "channel") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            width: "12",
            height: "12",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M22 2L11 13"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 36,
                    columnNumber: 139
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                    points: "22 2 15 22 11 13 2 9 22 2"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 36,
                    columnNumber: 162
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
            lineNumber: 36,
            columnNumber: 41
        }, this);
        if (chat.type === "bot") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            width: "12",
            height: "12",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    x: "3",
                    y: "11",
                    width: "18",
                    height: "10",
                    rx: "2"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 37,
                    columnNumber: 135
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "12",
                    cy: "5",
                    r: "2"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 37,
                    columnNumber: 185
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M12 7v4"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 37,
                    columnNumber: 215
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "8",
                    y1: "16",
                    x2: "8",
                    y2: "16"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 37,
                    columnNumber: 234
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "16",
                    y1: "16",
                    x2: "16",
                    y2: "16"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 37,
                    columnNumber: 271
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
            lineNumber: 37,
            columnNumber: 37
        }, this);
        return null;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
        className: "flex h-full flex-col bg-[var(--bg-sidebar)] transition-colors",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-lg font-bold gradient-text",
                                children: "Tepla"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                lineNumber: 46,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]",
                                children: "v2"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                lineNumber: 47,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-0.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                label: "Theme",
                                onClick: toggleTheme,
                                size: "sm",
                                children: theme === "dark" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "16",
                                    height: "16",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                            cx: "12",
                                            cy: "12",
                                            r: "5"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 51,
                                            columnNumber: 131
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "12",
                                            y1: "1",
                                            x2: "12",
                                            y2: "3"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 51,
                                            columnNumber: 162
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "12",
                                            y1: "21",
                                            x2: "12",
                                            y2: "23"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 51,
                                            columnNumber: 199
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "4.22",
                                            y1: "4.22",
                                            x2: "5.64",
                                            y2: "5.64"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 51,
                                            columnNumber: 238
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "18.36",
                                            y1: "18.36",
                                            x2: "19.78",
                                            y2: "19.78"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 51,
                                            columnNumber: 285
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "1",
                                            y1: "12",
                                            x2: "3",
                                            y2: "12"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 51,
                                            columnNumber: 336
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "21",
                                            y1: "12",
                                            x2: "23",
                                            y2: "12"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 51,
                                            columnNumber: 373
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "4.22",
                                            y1: "19.78",
                                            x2: "5.64",
                                            y2: "18.36"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 51,
                                            columnNumber: 412
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "18.36",
                                            y1: "5.64",
                                            x2: "19.78",
                                            y2: "4.22"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 51,
                                            columnNumber: 461
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 51,
                                    columnNumber: 33
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "16",
                                    height: "16",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                        lineNumber: 51,
                                        columnNumber: 617
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 51,
                                    columnNumber: 519
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                lineNumber: 50,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                label: "Premium",
                                onClick: togglePremium,
                                size: "sm",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "16",
                                    height: "16",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                        points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                        lineNumber: 54,
                                        columnNumber: 111
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 54,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                lineNumber: 53,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                label: "Settings",
                                onClick: toggleSettings,
                                size: "sm",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "16",
                                    height: "16",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                            cx: "12",
                                            cy: "12",
                                            r: "3"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 57,
                                            columnNumber: 111
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 57,
                                            columnNumber: 142
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 57,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                lineNumber: 56,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                label: "New Chat",
                                onClick: ()=>{
                                    setNewChatTab("contact");
                                    setShowNewChat(!showNewChat);
                                },
                                size: "sm",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "16",
                                    height: "16",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 60,
                                            columnNumber: 111
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "12",
                                            y1: "8",
                                            x2: "12",
                                            y2: "16"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 60,
                                            columnNumber: 184
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "8",
                                            y1: "12",
                                            x2: "16",
                                            y2: "12"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 60,
                                            columnNumber: 222
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 60,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                lineNumber: 59,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                        lineNumber: 49,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$stories$2f$StoriesBar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                stories: stories
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                lineNumber: 66,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-3 pb-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 rounded-xl bg-[var(--bg-input)] px-3 py-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "14",
                            height: "14",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            className: "shrink-0 text-[var(--text-tertiary)]",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: "11",
                                    cy: "11",
                                    r: "8"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 71,
                                    columnNumber: 158
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                    x1: "21",
                                    y1: "21",
                                    x2: "16.65",
                                    y2: "16.65"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 71,
                                    columnNumber: 189
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                            lineNumber: 71,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "text",
                            placeholder: "Search...",
                            value: searchQuery,
                            onChange: (e)=>setSearchQuery(e.target.value),
                            className: "w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                            lineNumber: 72,
                            columnNumber: 11
                        }, this),
                        searchQuery && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setSearchQuery(""),
                            className: "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "14",
                                height: "14",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M18 6L6 18M6 6l12 12"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 75,
                                    columnNumber: 113
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                lineNumber: 75,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                            lineNumber: 74,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                    lineNumber: 70,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                lineNumber: 69,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveFolder(null),
                        className: `shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${!activeFolderId ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`,
                        children: "All"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                        lineNumber: 83,
                        columnNumber: 9
                    }, this),
                    folders.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setActiveFolder(f.id === activeFolderId ? null : f.id),
                            className: `shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${f.id === activeFolderId ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`,
                            children: [
                                f.icon,
                                " ",
                                f.name
                            ]
                        }, f.id, true, {
                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                            lineNumber: 87,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                lineNumber: 82,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "flex-1 overflow-y-auto",
                children: [
                    filteredChats.length === 0 && !searchQuery && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center gap-4 px-6 py-10",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-[var(--text-tertiary)]",
                                children: "No chats yet. Get started!"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                lineNumber: 97,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col gap-2 w-full",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            setShowNewChat(true);
                                            setNewChatTab("contact");
                                        },
                                        className: "flex items-center gap-3 rounded-xl bg-[var(--bg-input)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-400",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    width: "18",
                                                    height: "18",
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                            d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 101,
                                                            columnNumber: 117
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                            cx: "8.5",
                                                            cy: "7",
                                                            r: "4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 101,
                                                            columnNumber: 170
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                            x1: "20",
                                                            y1: "8",
                                                            x2: "20",
                                                            y2: "14"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 101,
                                                            columnNumber: 201
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                            x1: "23",
                                                            y1: "11",
                                                            x2: "17",
                                                            y2: "11"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 101,
                                                            columnNumber: 239
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 101,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                lineNumber: 100,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium",
                                                        children: "Add Contact"
                                                    }, void 0, false, {
                                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                        lineNumber: 104,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[10px] text-[var(--text-tertiary)]",
                                                        children: "Find people by username"
                                                    }, void 0, false, {
                                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                        lineNumber: 105,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                lineNumber: 103,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                        lineNumber: 99,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            setShowNewChat(true);
                                            setNewChatTab("group");
                                        },
                                        className: "flex items-center gap-3 rounded-xl bg-[var(--bg-input)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    width: "18",
                                                    height: "18",
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                            d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 110,
                                                            columnNumber: 117
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                            cx: "9",
                                                            cy: "7",
                                                            r: "4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 110,
                                                            columnNumber: 170
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                            d: "M23 21v-2a4 4 0 0 0-3-3.87"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 110,
                                                            columnNumber: 199
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                            d: "M16 3.13a4 4 0 0 1 0 7.75"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 110,
                                                            columnNumber: 237
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 110,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                lineNumber: 109,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium",
                                                        children: "Create Group"
                                                    }, void 0, false, {
                                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                        lineNumber: 113,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[10px] text-[var(--text-tertiary)]",
                                                        children: "Chat with your team or friends"
                                                    }, void 0, false, {
                                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                        lineNumber: 114,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                lineNumber: 112,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                        lineNumber: 108,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>{
                                            setShowNewChat(true);
                                            setNewChatTab("channel");
                                        },
                                        className: "flex items-center gap-3 rounded-xl bg-[var(--bg-input)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-purple-400",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    width: "18",
                                                    height: "18",
                                                    viewBox: "0 0 24 24",
                                                    fill: "none",
                                                    stroke: "currentColor",
                                                    strokeWidth: "2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                            d: "M22 2L11 13"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 119,
                                                            columnNumber: 117
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                                            points: "22 2 15 22 11 13 2 9 22 2"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 119,
                                                            columnNumber: 140
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 119,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                lineNumber: 118,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-medium",
                                                        children: "Create Channel"
                                                    }, void 0, false, {
                                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                        lineNumber: 122,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[10px] text-[var(--text-tertiary)]",
                                                        children: "Broadcast to subscribers"
                                                    }, void 0, false, {
                                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                        lineNumber: 123,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                lineNumber: 121,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                        lineNumber: 117,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                lineNumber: 98,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                        lineNumber: 96,
                        columnNumber: 11
                    }, this),
                    filteredChats.map((chat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setActiveChat(chat.id),
                            className: `flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)] ${activeChatId === chat.id ? "bg-[var(--bg-active)]" : ""}`,
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    name: chat.name,
                                    src: chat.avatar,
                                    status: chat.user?.status,
                                    size: "md",
                                    isPremium: chat.user?.isPremium,
                                    showStatus: chat.type === "direct"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 131,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "min-w-0 flex-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-between",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-1.5",
                                                    children: [
                                                        chatTypeIcon(chat),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "truncate text-sm font-medium text-[var(--text-primary)]",
                                                            children: chat.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 143,
                                                            columnNumber: 19
                                                        }, this),
                                                        chat.isMuted && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                            width: "12",
                                                            height: "12",
                                                            viewBox: "0 0 24 24",
                                                            fill: "none",
                                                            stroke: "currentColor",
                                                            strokeWidth: "2",
                                                            className: "text-[var(--text-tertiary)]",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                    d: "M11 5L6 9H2v6h4l5 4V5z"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                                    lineNumber: 144,
                                                                    columnNumber: 174
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                                    x1: "23",
                                                                    y1: "9",
                                                                    x2: "17",
                                                                    y2: "15"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                                    lineNumber: 144,
                                                                    columnNumber: 208
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                                    x1: "17",
                                                                    y1: "9",
                                                                    x2: "23",
                                                                    y2: "15"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                                    lineNumber: 144,
                                                                    columnNumber: 246
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 144,
                                                            columnNumber: 36
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 141,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-1",
                                                    children: [
                                                        chat.isPinned && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                            width: "10",
                                                            height: "10",
                                                            viewBox: "0 0 24 24",
                                                            fill: "currentColor",
                                                            className: "text-[var(--text-tertiary)]",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                d: "M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                                lineNumber: 147,
                                                                columnNumber: 145
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 147,
                                                            columnNumber: 37
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] text-[var(--text-tertiary)]",
                                                            children: chat.lastMessage?.timestamp
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 148,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 146,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 140,
                                            columnNumber: 15
                                        }, this),
                                        chat.type === "direct" && chat.user?.username && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "truncate text-[10px] text-[var(--text-tertiary)]",
                                            children: [
                                                "@",
                                                chat.user.username
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 152,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-between",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "truncate text-xs text-[var(--text-secondary)]",
                                                    children: [
                                                        chat.lastMessage?.senderName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "font-medium text-[var(--accent)]",
                                                            children: [
                                                                chat.lastMessage.senderName,
                                                                ": "
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                            lineNumber: 156,
                                                            columnNumber: 52
                                                        }, this),
                                                        chat.lastMessage?.text
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 155,
                                                    columnNumber: 17
                                                }, this),
                                                chat.unreadCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `ml-2 flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${chat.isMuted ? "bg-[var(--text-tertiary)]" : "bg-[var(--accent)]"}`,
                                                    children: chat.unreadCount
                                                }, void 0, false, {
                                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                                    lineNumber: 160,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                            lineNumber: 154,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                                    lineNumber: 139,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, chat.id, true, {
                            fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                            lineNumber: 130,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                lineNumber: 94,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$NewChatModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                open: showNewChat,
                onClose: ()=>setShowNewChat(false),
                initialTab: newChatTab
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/Sidebar.tsx",
                lineNumber: 169,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/layout/Sidebar.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
_s(Sidebar, "4BIDtXF4nGg7MQfi5UtDeoy2Oe4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$hooks$2f$useTheme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = Sidebar;
var _c;
__turbopack_context__.k.register(_c, "Sidebar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/layout/Header.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Header
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/Avatar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/IconButton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function Header({ chat, onBack }) {
    _s();
    const { toggleProfile, toggleCalls, toggleTranslation } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const user = chat.user;
    const statusText = chat.type === "direct" ? user?.status === "online" ? "online" : user?.lastSeen ? `last seen ${user.lastSeen}` : "offline" : `${chat.membersCount || 0} members`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-2.5 transition-colors",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                label: "Back",
                onClick: onBack,
                className: "md:hidden",
                size: "sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    width: "20",
                    height: "20",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                        points: "15 18 9 12 15 6"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/Header.tsx",
                        lineNumber: 19,
                        columnNumber: 107
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/Header.tsx",
                    lineNumber: 19,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/Header.tsx",
                lineNumber: 18,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-w-0 flex-1 cursor-pointer items-center gap-3",
                onClick: toggleProfile,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        name: chat.name,
                        src: chat.avatar,
                        status: user?.status,
                        size: "sm",
                        isPremium: user?.isPremium,
                        showStatus: chat.type === "direct"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/Header.tsx",
                        lineNumber: 23,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0 flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "truncate text-sm font-semibold text-[var(--text-primary)]",
                                        children: chat.name
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/Header.tsx",
                                        lineNumber: 26,
                                        columnNumber: 13
                                    }, this),
                                    user?.isPremium && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "premium-text text-xs font-bold",
                                        children: "PRO"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/Header.tsx",
                                        lineNumber: 27,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/layout/Header.tsx",
                                lineNumber: 25,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: `text-xs ${user?.status === "online" ? "text-emerald-400" : "text-[var(--text-tertiary)]"}`,
                                children: chat.typing && chat.typing.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-[var(--accent)]",
                                    children: [
                                        chat.typing.join(", "),
                                        " typing..."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 31,
                                    columnNumber: 15
                                }, this) : statusText
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Header.tsx",
                                lineNumber: 29,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/layout/Header.tsx",
                        lineNumber: 24,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/Header.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-0.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        label: "Auto-translate",
                        onClick: ()=>toggleTranslation(chat.id),
                        size: "sm",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: chat.autoTranslate ? "var(--accent)" : "currentColor",
                            strokeWidth: "2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M5 8l6 6"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 41,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M4 14l6-6 2-3"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 41,
                                    columnNumber: 33
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M2 5h12"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 41,
                                    columnNumber: 58
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M7 2h1"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 41,
                                    columnNumber: 77
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M22 22l-5-10-5 10"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 41,
                                    columnNumber: 95
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M14 18h6"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 41,
                                    columnNumber: 124
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/layout/Header.tsx",
                            lineNumber: 40,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/Header.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        label: "Voice call",
                        onClick: toggleCalls,
                        size: "sm",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/Header.tsx",
                                lineNumber: 48,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/layout/Header.tsx",
                            lineNumber: 47,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/Header.tsx",
                        lineNumber: 46,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        label: "Video call",
                        onClick: toggleCalls,
                        size: "sm",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                    points: "23 7 16 12 23 17 23 7"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 55,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                    x: "1",
                                    y: "5",
                                    width: "15",
                                    height: "14",
                                    rx: "2",
                                    ry: "2"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 55,
                                    columnNumber: 54
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/layout/Header.tsx",
                            lineNumber: 54,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/Header.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        label: "Search",
                        size: "sm",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: "11",
                                    cy: "11",
                                    r: "8"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 61,
                                    columnNumber: 109
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                    x1: "21",
                                    y1: "21",
                                    x2: "16.65",
                                    y2: "16.65"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 61,
                                    columnNumber: 140
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/layout/Header.tsx",
                            lineNumber: 61,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/Header.tsx",
                        lineNumber: 60,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        label: "Info",
                        onClick: toggleProfile,
                        size: "sm",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: "12",
                                    cy: "12",
                                    r: "1"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 66,
                                    columnNumber: 109
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: "12",
                                    cy: "5",
                                    r: "1"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 66,
                                    columnNumber: 140
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: "12",
                                    cy: "19",
                                    r: "1"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/Header.tsx",
                                    lineNumber: 66,
                                    columnNumber: 170
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/layout/Header.tsx",
                            lineNumber: 66,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/Header.tsx",
                        lineNumber: 65,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/Header.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/layout/Header.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_s(Header, "6HPs8brFOLdL+BPm0Pa2nyDKm3Q=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = Header;
var _c;
__turbopack_context__.k.register(_c, "Header");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/chat/MessageBubble.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
const quickReactions = [
    "\u{1F44D}",
    "\u{2764}\u{FE0F}",
    "\u{1F602}",
    "\u{1F622}",
    "\u{1F525}",
    "\u{1F680}",
    "\u{1F914}",
    "\u{1F60D}"
];
function StatusIcon({ status }) {
    if (status === "sending") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
    }, void 0, false, {
        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
        lineNumber: 16,
        columnNumber: 36
    }, this);
    if (status === "failed") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: "14",
        height: "14",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "red",
        strokeWidth: "2.5",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: "12",
                cy: "12",
                r: "10"
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                lineNumber: 17,
                columnNumber: 126
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                x1: "15",
                y1: "9",
                x2: "9",
                y2: "15"
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                lineNumber: 17,
                columnNumber: 158
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                x1: "9",
                y1: "9",
                x2: "15",
                y2: "15"
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                lineNumber: 17,
                columnNumber: 195
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
        lineNumber: 17,
        columnNumber: 35
    }, this);
    if (status === "sent") return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: "14",
        height: "14",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.5",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
            points: "20 6 9 17 4 12"
        }, void 0, false, {
            fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
            lineNumber: 18,
            columnNumber: 133
        }, this)
    }, void 0, false, {
        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
        lineNumber: 18,
        columnNumber: 33
    }, this);
    const color = status === "read" ? "text-sky-300" : "";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: "14",
        height: "14",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.5",
        className: color,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                points: "18 6 7 17 2 12"
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                lineNumber: 20,
                columnNumber: 128
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                points: "22 6 11 17"
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                lineNumber: 20,
                columnNumber: 163
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
        lineNumber: 20,
        columnNumber: 10
    }, this);
}
_c = StatusIcon;
const __TURBOPACK__default__export__ = /*#__PURE__*/ _c2 = _s((0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memo"])(_c1 = _s(function MessageBubble({ message, isOwn, isFirstInGroup, isLastInGroup }) {
    _s();
    const [showActions, setShowActions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showReactions, setShowReactions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const { addReaction, setReplyingTo, pinMessage, deleteMessage } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const radiusOwn = `rounded-2xl ${isFirstInGroup ? "rounded-tr-sm" : ""} ${isLastInGroup ? "rounded-br-sm" : ""}`;
    const radiusOther = `rounded-2xl ${isFirstInGroup ? "rounded-tl-sm" : ""} ${isLastInGroup ? "rounded-bl-sm" : ""}`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `group relative flex ${isOwn ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-2" : "mb-0.5"}`,
        onMouseEnter: ()=>setShowActions(true),
        onMouseLeave: ()=>{
            setShowActions(false);
            setShowReactions(false);
        },
        children: [
            showActions && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `absolute top-0 z-10 flex items-center gap-0.5 animate-fade-in ${isOwn ? "right-[calc(100%_-_70%)] -translate-x-2" : "left-[calc(75%)] translate-x-2"}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setShowReactions(!showReactions),
                        className: "rounded-lg bg-[var(--bg-card)] p-1.5 text-[var(--text-tertiary)] shadow-sm hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                        title: "React",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "14",
                            height: "14",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: "12",
                                    cy: "12",
                                    r: "10"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                    lineNumber: 41,
                                    columnNumber: 111
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M8 14s1.5 2 4 2 4-2 4-2"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                    lineNumber: 41,
                                    columnNumber: 143
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                    x1: "9",
                                    y1: "9",
                                    x2: "9.01",
                                    y2: "9"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                    lineNumber: 41,
                                    columnNumber: 178
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                    x1: "15",
                                    y1: "9",
                                    x2: "15.01",
                                    y2: "9"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                    lineNumber: 41,
                                    columnNumber: 216
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                            lineNumber: 41,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 40,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setReplyingTo(message),
                        className: "rounded-lg bg-[var(--bg-card)] p-1.5 text-[var(--text-tertiary)] shadow-sm hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                        title: "Reply",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "14",
                            height: "14",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                    points: "9 17 4 12 9 7"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                    lineNumber: 44,
                                    columnNumber: 111
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M20 18v-2a4 4 0 0 0-4-4H4"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                    lineNumber: 44,
                                    columnNumber: 145
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                            lineNumber: 44,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 43,
                        columnNumber: 11
                    }, this),
                    isOwn && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>deleteMessage(message.chatId, message.id),
                        className: "rounded-lg bg-[var(--bg-card)] p-1.5 text-red-400 shadow-sm hover:bg-red-500/10",
                        title: "Delete",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "14",
                            height: "14",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                    points: "3 6 5 6 21 6"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                    lineNumber: 48,
                                    columnNumber: 113
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                    lineNumber: 48,
                                    columnNumber: 146
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                            lineNumber: 48,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 47,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>pinMessage(message.chatId, message.id),
                        className: "rounded-lg bg-[var(--bg-card)] p-1.5 text-[var(--text-tertiary)] shadow-sm hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                        title: "Pin",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "14",
                            height: "14",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                lineNumber: 52,
                                columnNumber: 111
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                            lineNumber: 52,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 51,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                lineNumber: 39,
                columnNumber: 9
            }, this),
            showReactions && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `absolute -top-10 z-20 flex gap-1 rounded-xl bg-[var(--bg-card)] p-1.5 shadow-lg animate-scale-in ${isOwn ? "right-4" : "left-4"}`,
                children: quickReactions.map((emoji)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>{
                            addReaction(message.chatId, message.id, emoji);
                            setShowReactions(false);
                        },
                        className: "rounded-lg p-1 text-lg transition-transform hover:scale-125 hover:bg-[var(--bg-hover)]",
                        children: emoji
                    }, emoji, false, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 61,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                lineNumber: 59,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `max-w-[75%] ${isOwn ? `${radiusOwn} bg-[var(--bg-bubble-own)] text-white` : `${radiusOther} bg-[var(--bg-bubble-other)] text-[var(--text-primary)]`}`,
                children: [
                    !isOwn && isFirstInGroup && message.senderName && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "px-3.5 pt-1.5 text-xs font-semibold text-[var(--accent)]",
                        children: message.senderName
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 71,
                        columnNumber: 11
                    }, this),
                    message.replyTo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `mx-2 mt-2 rounded-lg border-l-2 px-2.5 py-1.5 ${isOwn ? "border-white/40 bg-white/10" : "border-[var(--accent)] bg-[var(--accent-soft)]"}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: `text-[10px] font-semibold ${isOwn ? "text-white/70" : "text-[var(--accent)]"}`,
                                children: message.replyTo.senderName
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                lineNumber: 77,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: `truncate text-xs ${isOwn ? "text-white/60" : "text-[var(--text-secondary)]"}`,
                                children: message.replyTo.text
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                lineNumber: 78,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 76,
                        columnNumber: 11
                    }, this),
                    message.isForwarded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: `px-3.5 pt-1.5 text-[10px] italic ${isOwn ? "text-white/50" : "text-[var(--text-tertiary)]"}`,
                        children: [
                            "Forwarded",
                            message.forwardedFrom ? ` from ${message.forwardedFrom}` : ""
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 84,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-3.5 py-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "whitespace-pre-wrap text-sm leading-relaxed break-words",
                                children: message.text
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                lineNumber: 89,
                                columnNumber: 11
                            }, this),
                            message.translatedText && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `mt-1.5 border-t pt-1.5 ${isOwn ? "border-white/20" : "border-[var(--border)]"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: `text-[10px] ${isOwn ? "text-white/50" : "text-[var(--text-tertiary)]"}`,
                                        children: "Translated"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                        lineNumber: 94,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm leading-relaxed",
                                        children: message.translatedText
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                        lineNumber: 95,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                lineNumber: 93,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `mt-0.5 flex items-center justify-end gap-1 ${isOwn ? "text-white/50" : "text-[var(--text-tertiary)]"}`,
                                children: [
                                    message.isEdited && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px]",
                                        children: "edited"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                        lineNumber: 101,
                                        columnNumber: 34
                                    }, this),
                                    message.isPinned && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "10",
                                        height: "10",
                                        viewBox: "0 0 24 24",
                                        fill: "currentColor",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                            lineNumber: 102,
                                            columnNumber: 102
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                        lineNumber: 102,
                                        columnNumber: 34
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] leading-none",
                                        children: message.timestamp
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                        lineNumber: 103,
                                        columnNumber: 13
                                    }, this),
                                    isOwn && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusIcon, {
                                        status: message.status
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                        lineNumber: 104,
                                        columnNumber: 23
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                lineNumber: 100,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 88,
                        columnNumber: 9
                    }, this),
                    message.reactions && message.reactions.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap gap-1 px-2 pb-2",
                        children: message.reactions.map((r)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>addReaction(message.chatId, message.id, r.emoji),
                                className: `flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${r.myReaction ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]" : isOwn ? "bg-white/10 hover:bg-white/20" : "bg-[var(--bg-input)] hover:bg-[var(--bg-hover)]"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: r.emoji
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                        lineNumber: 113,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: r.myReaction ? "text-[var(--accent)]" : isOwn ? "text-white/70" : "text-[var(--text-secondary)]",
                                        children: r.count
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                        lineNumber: 114,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, r.emoji, true, {
                                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                lineNumber: 112,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 110,
                        columnNumber: 11
                    }, this),
                    message.threadRepliesCount && message.threadRepliesCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `flex items-center gap-1 px-3 pb-2 text-xs ${isOwn ? "text-white/60 hover:text-white/80" : "text-[var(--accent)] hover:text-[var(--accent-hover)]"}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "12",
                                height: "12",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                    lineNumber: 123,
                                    columnNumber: 111
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                                lineNumber: 123,
                                columnNumber: 13
                            }, this),
                            message.threadRepliesCount,
                            " replies"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                        lineNumber: 122,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
                lineNumber: 68,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/chat/MessageBubble.tsx",
        lineNumber: 32,
        columnNumber: 5
    }, this);
}, "wYd11ls8fPH8iv9tcf20p3vGG08=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
})), "wYd11ls8fPH8iv9tcf20p3vGG08=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "StatusIcon");
__turbopack_context__.k.register(_c1, "%default%$memo");
__turbopack_context__.k.register(_c2, "%default%");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/chat/MessageList.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MessageList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$MessageBubble$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/chat/MessageBubble.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function DateSeparator({ date }) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let label = d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric"
    });
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "my-3 flex justify-center",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "rounded-full bg-[var(--bg-card)] px-3 py-1 text-[11px] font-medium text-[var(--text-tertiary)] shadow-sm",
            children: label
        }, void 0, false, {
            fileName: "[project]/client/src/components/chat/MessageList.tsx",
            lineNumber: 23,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/client/src/components/chat/MessageList.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_c = DateSeparator;
function MessageList({ messages, currentUserId }) {
    _s();
    const bottomRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MessageList.useEffect": ()=>{
            bottomRef.current?.scrollIntoView({
                behavior: "smooth"
            });
        }
    }["MessageList.useEffect"], [
        messages
    ]);
    if (messages.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-1 flex-col items-center justify-center gap-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)]",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        width: "32",
                        height: "32",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "var(--accent)",
                        strokeWidth: "1.5",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageList.tsx",
                            lineNumber: 38,
                            columnNumber: 112
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageList.tsx",
                        lineNumber: 38,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/client/src/components/chat/MessageList.tsx",
                    lineNumber: 37,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-[var(--text-tertiary)]",
                    children: "No messages yet. Say hi!"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/chat/MessageList.tsx",
                    lineNumber: 40,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/client/src/components/chat/MessageList.tsx",
            lineNumber: 36,
            columnNumber: 7
        }, this);
    }
    const elements = [];
    let lastDate = "";
    messages.forEach((msg, i)=>{
        if (msg.date !== lastDate) {
            elements.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DateSeparator, {
                date: msg.date
            }, `d-${msg.date}`, false, {
                fileName: "[project]/client/src/components/chat/MessageList.tsx",
                lineNumber: 49,
                columnNumber: 48
            }, this));
            lastDate = msg.date;
        }
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const isOwn = msg.senderId === currentUserId;
        const isFirstInGroup = !prev || prev.senderId !== msg.senderId || prev.date !== msg.date;
        const isLastInGroup = !next || next.senderId !== msg.senderId || next.date !== msg.date;
        elements.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$MessageBubble$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            message: msg,
            isOwn: isOwn,
            isFirstInGroup: isFirstInGroup,
            isLastInGroup: isLastInGroup
        }, msg.id, false, {
            fileName: "[project]/client/src/components/chat/MessageList.tsx",
            lineNumber: 55,
            columnNumber: 19
        }, this));
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex-1 overflow-y-auto px-4 py-3",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto flex max-w-3xl flex-col",
            children: [
                elements,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    ref: bottomRef
                }, void 0, false, {
                    fileName: "[project]/client/src/components/chat/MessageList.tsx",
                    lineNumber: 60,
                    columnNumber: 66
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/client/src/components/chat/MessageList.tsx",
            lineNumber: 60,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/client/src/components/chat/MessageList.tsx",
        lineNumber: 59,
        columnNumber: 5
    }, this);
}
_s(MessageList, "eaUWg0io6wE0buoFSqU1QLjVsUo=");
_c1 = MessageList;
var _c, _c1;
__turbopack_context__.k.register(_c, "DateSeparator");
__turbopack_context__.k.register(_c1, "MessageList");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/chat/MessageInput.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MessageInput
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/IconButton.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function MessageInput({ chatId }) {
    _s();
    const [text, setText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [isRecording, setIsRecording] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [recordingTime, setRecordingTime] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [showAttach, setShowAttach] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showSchedule, setShowSchedule] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const textareaRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const timerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    const { sendMessage, replyingTo, editingMessage, setReplyingTo, setEditingMessage, toggleStickers, getDraft, setDraft } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    // Load draft on chat switch
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MessageInput.useEffect": ()=>{
            const draft = getDraft(chatId);
            if (draft && !editingMessage) setText(draft);
            else if (!editingMessage) setText("");
        }
    }["MessageInput.useEffect"], [
        chatId,
        getDraft,
        editingMessage
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MessageInput.useEffect": ()=>{
            const el = textareaRef.current;
            if (!el) return;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
        }
    }["MessageInput.useEffect"], [
        text
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MessageInput.useEffect": ()=>{
            if (editingMessage) {
                setText(editingMessage.text);
                textareaRef.current?.focus();
            }
        }
    }["MessageInput.useEffect"], [
        editingMessage
    ]);
    const handleSend = ()=>{
        const trimmed = text.trim();
        if (!trimmed) return;
        sendMessage(chatId, trimmed);
        setText("");
        setDraft(chatId, ""); // clear draft on send
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };
    const handleKeyDown = (e)=>{
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    const startRecording = ()=>{
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(()=>setRecordingTime((t)=>t + 1), 1000);
    };
    const stopRecording = ()=>{
        setIsRecording(false);
        clearInterval(timerRef.current);
        sendMessage(chatId, `Voice message (${formatTime(recordingTime)})`, "voice");
    };
    const cancelRecording = ()=>{
        setIsRecording(false);
        clearInterval(timerRef.current);
    };
    const formatTime = (s)=>`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
    const hasText = text.trim().length > 0;
    const attachOptions = [
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: "3",
                        y: "3",
                        width: "18",
                        height: "18",
                        rx: "2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 70,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "8.5",
                        cy: "8.5",
                        r: "1.5"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 70,
                        columnNumber: 160
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                        points: "21 15 16 10 5 21"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 70,
                        columnNumber: 195
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                lineNumber: 70,
                columnNumber: 13
            }, this),
            label: "Photo/Video",
            color: "text-violet-400"
        },
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 71,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                        points: "14 2 14 8 20 8"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 71,
                        columnNumber: 181
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                lineNumber: 71,
                columnNumber: 13
            }, this),
            label: "File",
            color: "text-sky-400"
        },
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 72,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "12",
                        cy: "10",
                        r: "3"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 72,
                        columnNumber: 169
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                lineNumber: 72,
                columnNumber: 13
            }, this),
            label: "Location",
            color: "text-emerald-400"
        },
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 73,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "12",
                        cy: "7",
                        r: "4"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 73,
                        columnNumber: 164
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                lineNumber: 73,
                columnNumber: 13
            }, this),
            label: "Contact",
            color: "text-amber-400"
        },
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M12 20V10"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 74,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M18 20V4"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 74,
                        columnNumber: 132
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M6 20v-4"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 74,
                        columnNumber: 152
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                lineNumber: 74,
                columnNumber: 13
            }, this),
            label: "Poll",
            color: "text-pink-400"
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        className: "border-t border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-2.5 transition-colors",
        children: [
            (replyingTo || editingMessage) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-2 flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-2 animate-slide-up",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "h-8 w-0.5 rounded-full bg-[var(--accent)]"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 82,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0 flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-semibold text-[var(--accent)]",
                                children: editingMessage ? "Editing" : `Reply to ${replyingTo?.senderName}`
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                lineNumber: 84,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "truncate text-xs text-[var(--text-secondary)]",
                                children: editingMessage?.text || replyingTo?.text
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                lineNumber: 85,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 83,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>{
                            setReplyingTo(null);
                            setEditingMessage(null);
                            setText("");
                        },
                        className: "rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M18 6L6 18M6 6l12 12"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                lineNumber: 88,
                                columnNumber: 111
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 88,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                        lineNumber: 87,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                lineNumber: 81,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto flex max-w-3xl items-end gap-2",
                children: isRecording ? /* Recording UI */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-1 items-center gap-3 rounded-xl bg-red-500/10 px-4 py-2.5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-3 w-3 animate-pulse rounded-full bg-red-500"
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 97,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-sm font-medium text-red-400",
                            children: formatTime(recordingTime)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 98,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1"
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 99,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: cancelRecording,
                            className: "text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
                            children: "Cancel"
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 100,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: stopRecording,
                            className: "rounded-lg bg-red-500 px-3 py-1 text-sm font-medium text-white",
                            children: "Send"
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 101,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                    lineNumber: 96,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    label: "Attach",
                                    onClick: ()=>setShowAttach(!showAttach),
                                    size: "sm",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "20",
                                        height: "20",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "2",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                            lineNumber: 108,
                                            columnNumber: 115
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 108,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                    lineNumber: 107,
                                    columnNumber: 15
                                }, this),
                                showAttach && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute bottom-12 left-0 z-20 w-48 rounded-xl bg-[var(--bg-card)] p-1.5 shadow-lg animate-scale-in",
                                    children: attachOptions.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setShowAttach(false),
                                            className: "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-hover)]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: opt.color,
                                                    children: opt.icon
                                                }, void 0, false, {
                                                    fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                                    lineNumber: 114,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[var(--text-primary)]",
                                                    children: opt.label
                                                }, void 0, false, {
                                                    fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                                    lineNumber: 115,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, opt.label, true, {
                                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                            lineNumber: 113,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                    lineNumber: 111,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 106,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                            ref: textareaRef,
                            rows: 1,
                            value: text,
                            onChange: (e)=>{
                                setText(e.target.value);
                                setDraft(chatId, e.target.value);
                            },
                            onKeyDown: handleKeyDown,
                            placeholder: "Message...",
                            className: "max-h-[120px] min-h-[36px] flex-1 resize-none rounded-xl bg-[var(--bg-input)] px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-colors"
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 123,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            label: "Stickers",
                            onClick: toggleStickers,
                            size: "sm",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "20",
                                height: "20",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                        cx: "12",
                                        cy: "12",
                                        r: "10"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 128,
                                        columnNumber: 113
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M8 14s1.5 2 4 2 4-2 4-2"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 128,
                                        columnNumber: 145
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "9",
                                        y1: "9",
                                        x2: "9.01",
                                        y2: "9"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 128,
                                        columnNumber: 180
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "15",
                                        y1: "9",
                                        x2: "15.01",
                                        y2: "9"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 128,
                                        columnNumber: 218
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                lineNumber: 128,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 127,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    label: "Schedule",
                                    onClick: ()=>setShowSchedule(!showSchedule),
                                    size: "sm",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "16",
                                        height: "16",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                cx: "12",
                                                cy: "12",
                                                r: "10"
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                                lineNumber: 134,
                                                columnNumber: 115
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                                points: "12 6 12 12 16 14"
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                                lineNumber: 134,
                                                columnNumber: 147
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 134,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                    lineNumber: 133,
                                    columnNumber: 15
                                }, this),
                                showSchedule && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute bottom-12 right-0 z-20 w-56 rounded-xl bg-[var(--bg-card)] p-3 shadow-lg animate-scale-in",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "mb-2 text-xs font-semibold text-[var(--text-secondary)]",
                                            children: "Schedule message"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                            lineNumber: 138,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "datetime-local",
                                            className: "w-full rounded-lg bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                            lineNumber: 139,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>{
                                                setShowSchedule(false);
                                                if (text.trim()) handleSend();
                                            },
                                            className: "mt-2 w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]",
                                            children: "Schedule"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                            lineNumber: 140,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                    lineNumber: 137,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 132,
                            columnNumber: 13
                        }, this),
                        hasText ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            label: "Send",
                            onClick: handleSend,
                            variant: "filled",
                            size: "sm",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "18",
                                height: "18",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "22",
                                        y1: "2",
                                        x2: "11",
                                        y2: "13"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 150,
                                        columnNumber: 115
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                        points: "22 2 15 22 11 13 2 9 22 2"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 150,
                                        columnNumber: 153
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                lineNumber: 150,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 149,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$IconButton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            label: "Voice message",
                            onClick: startRecording,
                            size: "sm",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "20",
                                height: "20",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 154,
                                        columnNumber: 115
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M19 10v2a7 7 0 0 1-14 0v-2"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 154,
                                        columnNumber: 179
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "12",
                                        y1: "19",
                                        x2: "12",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 154,
                                        columnNumber: 217
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "8",
                                        y1: "23",
                                        x2: "16",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                        lineNumber: 154,
                                        columnNumber: 256
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                                lineNumber: 154,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                            lineNumber: 153,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true)
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/MessageInput.tsx",
                lineNumber: 93,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/chat/MessageInput.tsx",
        lineNumber: 78,
        columnNumber: 5
    }, this);
}
_s(MessageInput, "QFZ5N05hOTZ1UgXBFw6c+gd8NSw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = MessageInput;
var _c;
__turbopack_context__.k.register(_c, "MessageInput");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/profile/ProfilePanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ProfilePanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/Avatar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function ProfilePanel({ chat }) {
    _s();
    const { toggleProfile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const user = chat.user;
    const [copiedField, setCopiedField] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    function copyToClipboard(text, field) {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(()=>setCopiedField(null), 1500);
    }
    const infoItems = [
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                    lineNumber: 21,
                    columnNumber: 111
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                lineNumber: 21,
                columnNumber: 13
            }, this),
            label: "Phone",
            value: user?.phone || "+7 (900) 123-45-67",
            copyable: true
        },
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 22,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "12",
                        cy: "7",
                        r: "4"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 22,
                        columnNumber: 164
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                lineNumber: 22,
                columnNumber: 13
            }, this),
            label: "Username",
            value: user?.username ? `@${user.username}` : "Not set",
            copyable: !!user?.username
        },
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "12",
                        cy: "12",
                        r: "10"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 23,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                        x1: "2",
                        y1: "12",
                        x2: "22",
                        y2: "12"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 23,
                        columnNumber: 143
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 23,
                        columnNumber: 181
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                lineNumber: 23,
                columnNumber: 13
            }, this),
            label: "Language",
            value: user?.language || "Russian",
            copyable: false
        }
    ];
    const actions = [
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: "3",
                        y: "3",
                        width: "18",
                        height: "18",
                        rx: "2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 27,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "8.5",
                        cy: "8.5",
                        r: "1.5"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 27,
                        columnNumber: 160
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                        points: "21 15 16 10 5 21"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 27,
                        columnNumber: 195
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                lineNumber: 27,
                columnNumber: 13
            }, this),
            label: "Photos & Videos",
            count: 42
        },
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 28,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                        points: "14 2 14 8 20 8"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 28,
                        columnNumber: 181
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                lineNumber: 28,
                columnNumber: 13
            }, this),
            label: "Files",
            count: 15
        },
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "11",
                        cy: "11",
                        r: "8"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 29,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                        x1: "21",
                        y1: "21",
                        x2: "16.65",
                        y2: "16.65"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 29,
                        columnNumber: 142
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                lineNumber: 29,
                columnNumber: 13
            }, this),
            label: "Links",
            count: 8
        },
        {
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 30,
                        columnNumber: 111
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M19 10v2a7 7 0 0 1-14 0v-2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 30,
                        columnNumber: 175
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                lineNumber: 30,
                columnNumber: 13
            }, this),
            label: "Voice Messages",
            count: 3
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex h-full flex-col bg-[var(--bg-sidebar)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "flex items-center justify-between border-b border-[var(--border)] px-4 py-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-sm font-semibold",
                        children: "Profile"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 36,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: toggleProfile,
                        className: "rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "18",
                            height: "18",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M18 6L6 18M6 6l12 12"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                lineNumber: 38,
                                columnNumber: 109
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                            lineNumber: 38,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 37,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 overflow-y-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center gap-3 p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                name: chat.name,
                                src: chat.avatar,
                                status: user?.status,
                                size: "xl",
                                isPremium: user?.isPremium
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                lineNumber: 45,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-lg font-semibold",
                                        children: chat.name
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 47,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: `text-xs ${user?.status === "online" ? "text-emerald-400" : "text-[var(--text-tertiary)]"}`,
                                        children: user?.status === "online" ? "online" : user?.lastSeen ? `last seen ${user.lastSeen}` : `${chat.membersCount || 0} members`
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 48,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                lineNumber: 46,
                                columnNumber: 11
                            }, this),
                            user?.bio && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-center text-sm text-[var(--text-secondary)]",
                                children: user.bio
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                lineNumber: 52,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 44,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border-t border-[var(--border)] px-4 py-3",
                        children: infoItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>item.copyable && copyToClipboard(item.value, item.label),
                                className: `flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${item.copyable ? "hover:bg-[var(--bg-hover)] cursor-pointer" : "cursor-default"}`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[var(--text-tertiary)]",
                                        children: item.icon
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 59,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1 min-w-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-[var(--text-primary)]",
                                                children: item.value
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                                lineNumber: 61,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-[var(--text-tertiary)]",
                                                children: item.label
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                                lineNumber: 62,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 60,
                                        columnNumber: 15
                                    }, this),
                                    copiedField === item.label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] text-emerald-400 shrink-0",
                                        children: "Copied!"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 64,
                                        columnNumber: 46
                                    }, this)
                                ]
                            }, item.label, true, {
                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                lineNumber: 58,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 56,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border-t border-[var(--border)] px-4 py-3",
                        children: actions.map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[var(--text-tertiary)]",
                                        children: a.icon
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 73,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "flex-1 text-sm text-[var(--text-primary)]",
                                        children: a.label
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 74,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-[var(--text-tertiary)]",
                                        children: a.count
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 75,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "14",
                                        height: "14",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "2",
                                        className: "text-[var(--text-tertiary)]",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                            points: "9 18 15 12 9 6"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                            lineNumber: 76,
                                            columnNumber: 153
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 76,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, a.label, true, {
                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                lineNumber: 72,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 70,
                        columnNumber: 9
                    }, this),
                    chat.type === "direct" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "border-t border-[var(--border)] px-4 py-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-red-400 transition-colors hover:bg-red-500/10",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "16",
                                        height: "16",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                                cx: "12",
                                                cy: "12",
                                                r: "10"
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                                lineNumber: 85,
                                                columnNumber: 113
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                x1: "4.93",
                                                y1: "4.93",
                                                x2: "19.07",
                                                y2: "19.07"
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                                lineNumber: 85,
                                                columnNumber: 145
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 85,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Block user"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 86,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                lineNumber: 84,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-red-400 transition-colors hover:bg-red-500/10",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "16",
                                        height: "16",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                                points: "3 6 5 6 21 6"
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                                lineNumber: 89,
                                                columnNumber: 113
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                                lineNumber: 89,
                                                columnNumber: 146
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 89,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm",
                                        children: "Delete chat"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                        lineNumber: 90,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                                lineNumber: 88,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                        lineNumber: 83,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/profile/ProfilePanel.tsx",
        lineNumber: 34,
        columnNumber: 5
    }, this);
}
_s(ProfilePanel, "oEGLMasJI4jvOTLI4XLKIZFCLeU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = ProfilePanel;
var _c;
__turbopack_context__.k.register(_c, "ProfilePanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/layout/ChatArea.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ChatArea
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$Header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/layout/Header.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$MessageList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/chat/MessageList.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$MessageInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/chat/MessageInput.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$profile$2f$ProfilePanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/profile/ProfilePanel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function ChatArea({ chat, messages, currentUserId, onBack }) {
    _s();
    const { showProfile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const pinnedMessages = messages.filter((m)=>m.isPinned);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "flex h-full bg-[var(--bg-main)] transition-colors",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-w-0 flex-1 flex-col",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$Header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        chat: chat,
                        onBack: onBack
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                        lineNumber: 23,
                        columnNumber: 9
                    }, this),
                    pinnedMessages.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-4 py-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "14",
                                height: "14",
                                viewBox: "0 0 24 24",
                                fill: "var(--accent)",
                                stroke: "none",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M16 3h-2V1h-4v2H8C7.45 3 7 3.45 7 4v2l2 2v4H5v2h6v6h2v-6h6v-2h-4V8l2-2V4c0-.55-.45-1-1-1z"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                                    lineNumber: 28,
                                    columnNumber: 96
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                                lineNumber: 28,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "truncate text-xs text-[var(--text-secondary)]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-medium text-[var(--accent)]",
                                        children: "Pinned: "
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                                        lineNumber: 30,
                                        columnNumber: 15
                                    }, this),
                                    pinnedMessages[pinnedMessages.length - 1].text
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                                lineNumber: 29,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                        lineNumber: 27,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$MessageList$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        messages: messages,
                        currentUserId: currentUserId
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                        lineNumber: 36,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$MessageInput$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        chatId: chat.id
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                        lineNumber: 37,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, this),
            showProfile && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "hidden w-[320px] shrink-0 border-l border-[var(--border)] lg:block animate-slide-in-right",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$profile$2f$ProfilePanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    chat: chat
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                    lineNumber: 43,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/ChatArea.tsx",
                lineNumber: 42,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/layout/ChatArea.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
_s(ChatArea, "vDmOmsZ2Tdc2acWAsuKq9/6egPE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = ChatArea;
var _c;
__turbopack_context__.k.register(_c, "ChatArea");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/chat/EmptyChat.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>EmptyChat
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
"use client";
;
function EmptyChat() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex h-full flex-col items-center justify-center gap-4 bg-[var(--bg-main)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent-soft)]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    width: "40",
                    height: "40",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "var(--accent)",
                    strokeWidth: "1.5",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/EmptyChat.tsx",
                        lineNumber: 8,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/client/src/components/chat/EmptyChat.tsx",
                    lineNumber: 7,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/EmptyChat.tsx",
                lineNumber: 6,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-lg font-semibold text-[var(--text-primary)]",
                        children: "Tepla Messenger"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/EmptyChat.tsx",
                        lineNumber: 12,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-sm text-[var(--text-tertiary)]",
                        children: "Select a chat to start messaging"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/chat/EmptyChat.tsx",
                        lineNumber: 13,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/chat/EmptyChat.tsx",
                lineNumber: 11,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-4 flex flex-wrap justify-center gap-2",
                children: [
                    "E2E Encrypted",
                    "Voice & Video Calls",
                    "Stories",
                    "Bots",
                    "Stickers",
                    "Auto-Translate"
                ].map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "rounded-full bg-[var(--bg-card)] px-3 py-1 text-xs text-[var(--text-secondary)]",
                        children: f
                    }, f, false, {
                        fileName: "[project]/client/src/components/chat/EmptyChat.tsx",
                        lineNumber: 17,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/client/src/components/chat/EmptyChat.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/chat/EmptyChat.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
_c = EmptyChat;
var _c;
__turbopack_context__.k.register(_c, "EmptyChat");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/lib/countries.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyMask",
    ()=>applyMask,
    "countries",
    ()=>countries,
    "defaultCountry",
    ()=>defaultCountry,
    "digitsOnly",
    ()=>digitsOnly,
    "languages",
    ()=>languages,
    "maxDigits",
    ()=>maxDigits
]);
const countries = [
    {
        code: "RU",
        name: "Россия",
        dial: "+7",
        flag: "\u{1F1F7}\u{1F1FA}",
        mask: "(XXX) XXX-XX-XX"
    },
    {
        code: "UA",
        name: "Украина",
        dial: "+380",
        flag: "\u{1F1FA}\u{1F1E6}",
        mask: "(XX) XXX-XX-XX"
    },
    {
        code: "BY",
        name: "Беларусь",
        dial: "+375",
        flag: "\u{1F1E7}\u{1F1FE}",
        mask: "(XX) XXX-XX-XX"
    },
    {
        code: "KZ",
        name: "Казахстан",
        dial: "+7",
        flag: "\u{1F1F0}\u{1F1FF}",
        mask: "(XXX) XXX-XX-XX"
    },
    {
        code: "US",
        name: "United States",
        dial: "+1",
        flag: "\u{1F1FA}\u{1F1F8}",
        mask: "(XXX) XXX-XXXX"
    },
    {
        code: "GB",
        name: "United Kingdom",
        dial: "+44",
        flag: "\u{1F1EC}\u{1F1E7}",
        mask: "XXXX XXXXXX"
    },
    {
        code: "DE",
        name: "Deutschland",
        dial: "+49",
        flag: "\u{1F1E9}\u{1F1EA}",
        mask: "XXXX XXXXXXX"
    },
    {
        code: "FR",
        name: "France",
        dial: "+33",
        flag: "\u{1F1EB}\u{1F1F7}",
        mask: "X XX XX XX XX"
    },
    {
        code: "TR",
        name: "Turkiye",
        dial: "+90",
        flag: "\u{1F1F9}\u{1F1F7}",
        mask: "(XXX) XXX XX XX"
    },
    {
        code: "UZ",
        name: "O'zbekiston",
        dial: "+998",
        flag: "\u{1F1FA}\u{1F1FF}",
        mask: "XX XXX XX XX"
    },
    {
        code: "GE",
        name: "Georgia",
        dial: "+995",
        flag: "\u{1F1EC}\u{1F1EA}",
        mask: "XXX XX XX XX"
    },
    {
        code: "AZ",
        name: "Azerbaijan",
        dial: "+994",
        flag: "\u{1F1E6}\u{1F1FF}",
        mask: "XX XXX XX XX"
    },
    {
        code: "AM",
        name: "Armenia",
        dial: "+374",
        flag: "\u{1F1E6}\u{1F1F2}",
        mask: "XX XXXXXX"
    },
    {
        code: "KG",
        name: "Kyrgyzstan",
        dial: "+996",
        flag: "\u{1F1F0}\u{1F1EC}",
        mask: "XXX XXXXXX"
    },
    {
        code: "TJ",
        name: "Tajikistan",
        dial: "+992",
        flag: "\u{1F1F9}\u{1F1EF}",
        mask: "XX XXX XXXX"
    },
    {
        code: "MD",
        name: "Moldova",
        dial: "+373",
        flag: "\u{1F1F2}\u{1F1E9}",
        mask: "XXXX XXXX"
    },
    {
        code: "CN",
        name: "China",
        dial: "+86",
        flag: "\u{1F1E8}\u{1F1F3}",
        mask: "XXX XXXX XXXX"
    },
    {
        code: "JP",
        name: "Japan",
        dial: "+81",
        flag: "\u{1F1EF}\u{1F1F5}",
        mask: "XX-XXXX-XXXX"
    },
    {
        code: "KR",
        name: "South Korea",
        dial: "+82",
        flag: "\u{1F1F0}\u{1F1F7}",
        mask: "XX-XXXX-XXXX"
    },
    {
        code: "IN",
        name: "India",
        dial: "+91",
        flag: "\u{1F1EE}\u{1F1F3}",
        mask: "XXXXX XXXXX"
    },
    {
        code: "BR",
        name: "Brazil",
        dial: "+55",
        flag: "\u{1F1E7}\u{1F1F7}",
        mask: "(XX) XXXXX-XXXX"
    },
    {
        code: "AE",
        name: "UAE",
        dial: "+971",
        flag: "\u{1F1E6}\u{1F1EA}",
        mask: "XX XXX XXXX"
    },
    {
        code: "IL",
        name: "Israel",
        dial: "+972",
        flag: "\u{1F1EE}\u{1F1F1}",
        mask: "XX-XXX-XXXX"
    }
];
const defaultCountry = countries[0];
function digitsOnly(s) {
    return s.replace(/\D/g, "");
}
function maxDigits(mask) {
    return (mask.match(/X/g) || []).length;
}
function applyMask(digits, mask) {
    let result = "";
    let di = 0;
    for (const ch of mask){
        if (di >= digits.length) break;
        if (ch === "X") {
            result += digits[di++];
        } else {
            result += ch;
        }
    }
    return result;
}
const languages = [
    {
        code: "ru",
        name: "Русский",
        flag: "\u{1F1F7}\u{1F1FA}"
    },
    {
        code: "en",
        name: "English",
        flag: "\u{1F1EC}\u{1F1E7}"
    },
    {
        code: "uk",
        name: "Українська",
        flag: "\u{1F1FA}\u{1F1E6}"
    },
    {
        code: "de",
        name: "Deutsch",
        flag: "\u{1F1E9}\u{1F1EA}"
    },
    {
        code: "fr",
        name: "Francais",
        flag: "\u{1F1EB}\u{1F1F7}"
    },
    {
        code: "es",
        name: "Espanol",
        flag: "\u{1F1EA}\u{1F1F8}"
    },
    {
        code: "tr",
        name: "Turkce",
        flag: "\u{1F1F9}\u{1F1F7}"
    },
    {
        code: "zh",
        name: "Chinese",
        flag: "\u{1F1E8}\u{1F1F3}"
    },
    {
        code: "ja",
        name: "Japanese",
        flag: "\u{1F1EF}\u{1F1F5}"
    },
    {
        code: "ko",
        name: "Korean",
        flag: "\u{1F1F0}\u{1F1F7}"
    },
    {
        code: "ar",
        name: "Arabic",
        flag: "\u{1F1F8}\u{1F1E6}"
    },
    {
        code: "pt",
        name: "Portugues",
        flag: "\u{1F1E7}\u{1F1F7}"
    },
    {
        code: "it",
        name: "Italiano",
        flag: "\u{1F1EE}\u{1F1F9}"
    },
    {
        code: "kk",
        name: "Kazakh",
        flag: "\u{1F1F0}\u{1F1FF}"
    },
    {
        code: "uz",
        name: "O'zbek",
        flag: "\u{1F1FA}\u{1F1FF}"
    }
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/layout/SettingsPanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SettingsPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/auth-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/Avatar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$countries$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/countries.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function SettingsPanel() {
    _s();
    const { showSettings, toggleSettings } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const { user, language, setLanguage, setUsername, logout } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])();
    const [activeSection, setActiveSection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editingUsername, setEditingUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [newUsername, setNewUsername] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [usernameStatus, setUsernameStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("idle");
    // Settings state
    const [notifSound, setNotifSound] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [notifPreview, setNotifPreview] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [notifPush, setNotifPush] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [notifGroupSound, setNotifGroupSound] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [privacyLastSeen, setPrivacyLastSeen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("everyone");
    const [privacyPhone, setPrivacyPhone] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("nobody");
    const [privacyPhoto, setPrivacyPhoto] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("everyone");
    const [privacyForwards, setPrivacyForwards] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("everyone");
    const [autoDownloadPhotos, setAutoDownloadPhotos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [autoDownloadVideos, setAutoDownloadVideos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [autoDownloadFiles, setAutoDownloadFiles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [fontSize, setFontSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(14);
    const [sendByEnter, setSendByEnter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [animatedEmoji, setAnimatedEmoji] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    function handleUsernameEdit() {
        setNewUsername(user?.username || "");
        setEditingUsername(true);
        setUsernameStatus("idle");
    }
    function handleUsernameChange(val) {
        const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
        setNewUsername(clean);
        if (clean.length < 4) {
            setUsernameStatus("idle");
            return;
        }
        if (clean === user?.username) {
            setUsernameStatus("idle");
            return;
        }
        setUsernameStatus("checking");
        setTimeout(()=>{
            const taken = [
                "admin",
                "tepla",
                "support",
                "help"
            ];
            setUsernameStatus(taken.includes(clean) ? "taken" : "available");
        }, 500);
    }
    function handleUsernameSave() {
        if (newUsername.length < 4 || usernameStatus === "taken") return;
        setUsername(newUsername);
        setUsernameStatus("saved");
        setTimeout(()=>{
            setEditingUsername(false);
            setUsernameStatus("idle");
        }, 1000);
    }
    if (!showSettings) return null;
    const sections = [
        {
            id: "general",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "12",
                        cy: "12",
                        r: "3"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 60,
                        columnNumber: 126
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 60,
                        columnNumber: 157
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 60,
                columnNumber: 28
            }, this),
            label: "General"
        },
        {
            id: "notifications",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 61,
                        columnNumber: 132
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M13.73 21a2 2 0 0 1-3.46 0"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 61,
                        columnNumber: 187
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 61,
                columnNumber: 34
            }, this),
            label: "Notifications"
        },
        {
            id: "privacy",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: "3",
                        y: "11",
                        width: "18",
                        height: "11",
                        rx: "2",
                        ry: "2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 62,
                        columnNumber: 126
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M7 11V7a5 5 0 0 1 10 0v4"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 62,
                        columnNumber: 183
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 62,
                columnNumber: 28
            }, this),
            label: "Privacy & Security"
        },
        {
            id: "language",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: "12",
                        cy: "12",
                        r: "10"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 63,
                        columnNumber: 127
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                        x1: "2",
                        y1: "12",
                        x2: "22",
                        y2: "12"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 63,
                        columnNumber: 159
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 63,
                        columnNumber: 197
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 63,
                columnNumber: 29
            }, this),
            label: "Language & Translation"
        },
        {
            id: "storage",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                    lineNumber: 64,
                    columnNumber: 126
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 64,
                columnNumber: 28
            }, this),
            label: "Storage & Data"
        },
        {
            id: "devices",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: "2",
                        y: "3",
                        width: "20",
                        height: "14",
                        rx: "2",
                        ry: "2"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 65,
                        columnNumber: 126
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                        x1: "8",
                        y1: "21",
                        x2: "16",
                        y2: "21"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 65,
                        columnNumber: 182
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                        x1: "12",
                        y1: "17",
                        x2: "12",
                        y2: "21"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                        lineNumber: 65,
                        columnNumber: 220
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 65,
                columnNumber: 28
            }, this),
            label: "Devices"
        },
        {
            id: "folders",
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "18",
                height: "18",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                    lineNumber: 66,
                    columnNumber: 126
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 66,
                columnNumber: 28
            }, this),
            label: "Chat Folders"
        }
    ];
    function Toggle({ on, onChange }) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: ()=>onChange(!on),
            className: `relative h-6 w-11 rounded-full transition-colors ${on ? "bg-[var(--accent)]" : "bg-[var(--bg-input)]"}`,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 72,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
            lineNumber: 71,
            columnNumber: 7
        }, this);
    }
    function SettingRow({ label, children }) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between py-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm text-[var(--text-secondary)]",
                    children: label
                }, void 0, false, {
                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                    lineNumber: 80,
                    columnNumber: 9
                }, this),
                children
            ]
        }, void 0, true, {
            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
            lineNumber: 79,
            columnNumber: 7
        }, this);
    }
    function RadioGroup({ value, options, onChange }) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex gap-1",
            children: options.map((o)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: ()=>onChange(o.value),
                    className: `rounded-lg px-2.5 py-1 text-xs transition-colors ${value === o.value ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`,
                    children: o.label
                }, o.value, false, {
                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                    lineNumber: 90,
                    columnNumber: 11
                }, this))
        }, void 0, false, {
            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
            lineNumber: 88,
            columnNumber: 7
        }, this);
    }
    const privacyOptions = [
        {
            value: "everyone",
            label: "Everyone"
        },
        {
            value: "contacts",
            label: "Contacts"
        },
        {
            value: "nobody",
            label: "Nobody"
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-40 flex animate-fade-in",
        onClick: toggleSettings,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 bg-[var(--bg-overlay)]"
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 106,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative ml-auto flex h-full w-full max-w-md bg-[var(--bg-sidebar)] shadow-2xl animate-slide-in-right",
                onClick: (e)=>e.stopPropagation(),
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex h-full w-full flex-col",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                            className: "flex items-center gap-3 border-b border-[var(--border)] px-4 py-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: toggleSettings,
                                    className: "rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "20",
                                        height: "20",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "2",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M18 6L6 18M6 6l12 12"
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                            lineNumber: 111,
                                            columnNumber: 113
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                        lineNumber: 111,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                    lineNumber: 110,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-lg font-semibold",
                                    children: "Settings"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                    lineNumber: 113,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                            lineNumber: 109,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 overflow-y-auto",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-4 border-b border-[var(--border)] p-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            name: user?.name || "User",
                                            size: "lg",
                                            status: "online",
                                            isPremium: user?.isPremium
                                        }, void 0, false, {
                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                            lineNumber: 119,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex-1 min-w-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "font-semibold",
                                                    children: user?.name || "User"
                                                }, void 0, false, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 121,
                                                    columnNumber: 17
                                                }, this),
                                                !editingUsername ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: handleUsernameEdit,
                                                    className: "group flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "@",
                                                                user?.username || "set_username"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 124,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                            width: "12",
                                                            height: "12",
                                                            viewBox: "0 0 24 24",
                                                            fill: "none",
                                                            stroke: "currentColor",
                                                            strokeWidth: "2",
                                                            className: "opacity-0 group-hover:opacity-100 transition-opacity",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                    d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 125,
                                                                    columnNumber: 184
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                    d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 125,
                                                                    columnNumber: 254
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 125,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 123,
                                                    columnNumber: 19
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-1.5 mt-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs text-[var(--text-tertiary)]",
                                                            children: "@"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 129,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "text",
                                                            value: newUsername,
                                                            onChange: (e)=>handleUsernameChange(e.target.value),
                                                            maxLength: 32,
                                                            autoFocus: true,
                                                            className: "w-24 bg-[var(--bg-input)] rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]",
                                                            onKeyDown: (e)=>{
                                                                if (e.key === "Enter") handleUsernameSave();
                                                                if (e.key === "Escape") {
                                                                    setEditingUsername(false);
                                                                    setUsernameStatus("idle");
                                                                }
                                                            }
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 130,
                                                            columnNumber: 21
                                                        }, this),
                                                        usernameStatus === "checking" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "h-3 w-3 animate-spin rounded-full border border-[var(--accent)] border-t-transparent"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 134,
                                                            columnNumber: 55
                                                        }, this),
                                                        usernameStatus === "available" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: handleUsernameSave,
                                                            className: "text-emerald-400",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                width: "14",
                                                                height: "14",
                                                                viewBox: "0 0 24 24",
                                                                fill: "none",
                                                                stroke: "currentColor",
                                                                strokeWidth: "2",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                                                    points: "20 6 9 17 4 12"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 137,
                                                                    columnNumber: 123
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 137,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 136,
                                                            columnNumber: 23
                                                        }, this),
                                                        usernameStatus === "taken" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] text-red-400",
                                                            children: "taken"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 140,
                                                            columnNumber: 52
                                                        }, this),
                                                        usernameStatus === "saved" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] text-emerald-400",
                                                            children: "saved!"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 141,
                                                            columnNumber: 52
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>{
                                                                setEditingUsername(false);
                                                                setUsernameStatus("idle");
                                                            },
                                                            className: "text-[var(--text-tertiary)]",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                width: "12",
                                                                height: "12",
                                                                viewBox: "0 0 24 24",
                                                                fill: "none",
                                                                stroke: "currentColor",
                                                                strokeWidth: "2",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                    d: "M18 6L6 18M6 6l12 12"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 143,
                                                                    columnNumber: 121
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 143,
                                                                columnNumber: 23
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 142,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 128,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                            lineNumber: 120,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                    lineNumber: 118,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-2",
                                    children: sections.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: ()=>setActiveSection(activeSection === s.id ? null : s.id),
                                                    className: "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[var(--text-tertiary)]",
                                                            children: s.icon
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 155,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "flex-1 text-sm",
                                                            children: s.label
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 156,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                            width: "14",
                                                            height: "14",
                                                            viewBox: "0 0 24 24",
                                                            fill: "none",
                                                            stroke: "currentColor",
                                                            strokeWidth: "2",
                                                            className: `text-[var(--text-tertiary)] transition-transform ${activeSection === s.id ? "rotate-90" : ""}`,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                                                points: "9 18 15 12 9 6"
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 157,
                                                                columnNumber: 227
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 157,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 154,
                                                    columnNumber: 19
                                                }, this),
                                                activeSection === "general" && s.id === "general" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Font size",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>setFontSize(Math.max(12, fontSize - 1)),
                                                                        className: "rounded bg-[var(--bg-main)] px-2 py-0.5 text-xs hover:bg-[var(--bg-hover)]",
                                                                        children: "-"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                        lineNumber: 165,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-xs w-6 text-center",
                                                                        children: fontSize
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                        lineNumber: 166,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>setFontSize(Math.min(20, fontSize + 1)),
                                                                        className: "rounded bg-[var(--bg-main)] px-2 py-0.5 text-xs hover:bg-[var(--bg-hover)]",
                                                                        children: "+"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                        lineNumber: 167,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 164,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 163,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Send by Enter",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                                                on: sendByEnter,
                                                                onChange: setSendByEnter
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 170,
                                                                columnNumber: 57
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 170,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Animated emoji",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                                                on: animatedEmoji,
                                                                onChange: setAnimatedEmoji
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 171,
                                                                columnNumber: 58
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 171,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 162,
                                                    columnNumber: 21
                                                }, this),
                                                activeSection === "notifications" && s.id === "notifications" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]",
                                                            children: "Private Chats"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 178,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Sound",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                                                on: notifSound,
                                                                onChange: setNotifSound
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 179,
                                                                columnNumber: 49
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 179,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Message preview",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                                                on: notifPreview,
                                                                onChange: setNotifPreview
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 180,
                                                                columnNumber: 59
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 180,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Push notifications",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                                                on: notifPush,
                                                                onChange: setNotifPush
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 181,
                                                                columnNumber: 62
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 181,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "my-2 border-t border-[var(--border)]"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 182,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]",
                                                            children: "Groups & Channels"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 183,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Sound",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                                                on: notifGroupSound,
                                                                onChange: setNotifGroupSound
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 184,
                                                                columnNumber: 49
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 184,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 177,
                                                    columnNumber: 21
                                                }, this),
                                                activeSection === "privacy" && s.id === "privacy" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]",
                                                            children: "Who can see"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 191,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Last seen",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RadioGroup, {
                                                                value: privacyLastSeen,
                                                                options: privacyOptions,
                                                                onChange: setPrivacyLastSeen
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 192,
                                                                columnNumber: 53
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 192,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Phone number",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RadioGroup, {
                                                                value: privacyPhone,
                                                                options: privacyOptions,
                                                                onChange: setPrivacyPhone
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 193,
                                                                columnNumber: 56
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 193,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Profile photo",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RadioGroup, {
                                                                value: privacyPhoto,
                                                                options: privacyOptions,
                                                                onChange: setPrivacyPhoto
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 194,
                                                                columnNumber: 57
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 194,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Forwarded messages",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(RadioGroup, {
                                                                value: privacyForwards,
                                                                options: privacyOptions,
                                                                onChange: setPrivacyForwards
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 195,
                                                                columnNumber: 62
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 195,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "my-2 border-t border-[var(--border)]"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 196,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]",
                                                            children: "Security"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 197,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            className: "w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors mb-1.5",
                                                            children: [
                                                                "Two-Factor Authentication",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "block text-[10px] text-[var(--text-tertiary)]",
                                                                    children: "Add an extra layer of security"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 200,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 198,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            className: "w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors mb-1.5",
                                                            children: [
                                                                "Active Sessions",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "block text-[10px] text-[var(--text-tertiary)]",
                                                                    children: "Manage logged-in devices"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 204,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 202,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            className: "w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors",
                                                            children: [
                                                                "Delete Account",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "block text-[10px] text-red-400/60",
                                                                    children: "Permanently delete your account and data"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 208,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 206,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 190,
                                                    columnNumber: 21
                                                }, this),
                                                activeSection === "language" && s.id === "language" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mb-2 text-xs text-[var(--text-tertiary)]",
                                                            children: "Auto-translate messages to:"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 216,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-2 gap-1.5",
                                                            children: __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$countries$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["languages"].map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>setLanguage(l.code),
                                                                    className: `flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${language === l.code ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--bg-hover)]"}`,
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            children: l.flag
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 220,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            children: l.name
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 220,
                                                                            columnNumber: 50
                                                                        }, this)
                                                                    ]
                                                                }, l.code, true, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 219,
                                                                    columnNumber: 27
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 217,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 215,
                                                    columnNumber: 21
                                                }, this),
                                                activeSection === "storage" && s.id === "storage" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]",
                                                            children: "Auto-download"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 230,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Photos",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                                                on: autoDownloadPhotos,
                                                                onChange: setAutoDownloadPhotos
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 231,
                                                                columnNumber: 50
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 231,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Videos",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                                                on: autoDownloadVideos,
                                                                onChange: setAutoDownloadVideos
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 232,
                                                                columnNumber: 50
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 232,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SettingRow, {
                                                            label: "Files",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Toggle, {
                                                                on: autoDownloadFiles,
                                                                onChange: setAutoDownloadFiles
                                                            }, void 0, false, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 233,
                                                                columnNumber: 49
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 233,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "my-2 border-t border-[var(--border)]"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 234,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]",
                                                            children: "Storage usage"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 235,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "space-y-1.5",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex justify-between text-xs",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[var(--text-secondary)]",
                                                                            children: "Photos"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 238,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[var(--text-tertiary)]",
                                                                            children: "12.4 MB"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 239,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 237,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex justify-between text-xs",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[var(--text-secondary)]",
                                                                            children: "Videos"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 242,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[var(--text-tertiary)]",
                                                                            children: "0 B"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 243,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 241,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex justify-between text-xs",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[var(--text-secondary)]",
                                                                            children: "Files"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 246,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[var(--text-tertiary)]",
                                                                            children: "2.1 MB"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 247,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 245,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex justify-between text-xs font-medium pt-1 border-t border-[var(--border)]",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[var(--text-primary)]",
                                                                            children: "Total"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 250,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[var(--text-primary)]",
                                                                            children: "14.5 MB"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 251,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 249,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 236,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            className: "mt-3 w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-colors",
                                                            children: "Clear Cache"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 254,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 229,
                                                    columnNumber: 21
                                                }, this),
                                                activeSection === "devices" && s.id === "devices" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]",
                                                            children: "Current device"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 263,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-3 rounded-lg bg-[var(--bg-main)] p-2.5 mb-3",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                        width: "18",
                                                                        height: "18",
                                                                        viewBox: "0 0 24 24",
                                                                        fill: "none",
                                                                        stroke: "currentColor",
                                                                        strokeWidth: "2",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                                                                x: "2",
                                                                                y: "3",
                                                                                width: "20",
                                                                                height: "14",
                                                                                rx: "2"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                                lineNumber: 266,
                                                                                columnNumber: 125
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                                                x1: "8",
                                                                                y1: "21",
                                                                                x2: "16",
                                                                                y2: "21"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                                lineNumber: 266,
                                                                                columnNumber: 174
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                                                x1: "12",
                                                                                y1: "17",
                                                                                x2: "12",
                                                                                y2: "21"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                                lineNumber: 266,
                                                                                columnNumber: 212
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                        lineNumber: 266,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 265,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-xs font-medium",
                                                                            children: "This device"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 269,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[10px] text-[var(--text-tertiary)]",
                                                                            children: "Windows - Chrome"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 270,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[10px] text-emerald-400",
                                                                            children: "Online now"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                            lineNumber: 271,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                    lineNumber: 268,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 264,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            className: "w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-colors",
                                                            children: "Terminate All Other Sessions"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 274,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 262,
                                                    columnNumber: 21
                                                }, this),
                                                activeSection === "folders" && s.id === "folders" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]",
                                                            children: "Your folders"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 283,
                                                            columnNumber: 23
                                                        }, this),
                                                        [
                                                            {
                                                                name: "Work",
                                                                icon: "\ud83d\udcbc",
                                                                count: 0
                                                            },
                                                            {
                                                                name: "Channels",
                                                                icon: "\ud83d\udce2",
                                                                count: 0
                                                            },
                                                            {
                                                                name: "Bots",
                                                                icon: "\ud83e\udd16",
                                                                count: 0
                                                            }
                                                        ].map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center justify-between rounded-lg bg-[var(--bg-main)] px-3 py-2.5 mb-1.5",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "flex items-center gap-2",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                children: f.icon
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                                lineNumber: 291,
                                                                                columnNumber: 29
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                className: "text-xs font-medium",
                                                                                children: f.name
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                                lineNumber: 292,
                                                                                columnNumber: 29
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                        lineNumber: 290,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[10px] text-[var(--text-tertiary)]",
                                                                        children: [
                                                                            f.count,
                                                                            " chats"
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                        lineNumber: 294,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, f.name, true, {
                                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                                lineNumber: 289,
                                                                columnNumber: 25
                                                            }, this)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            className: "mt-2 w-full rounded-lg border border-dashed border-[var(--border)] px-3 py-2.5 text-xs text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors",
                                                            children: "+ Create New Folder"
                                                        }, void 0, false, {
                                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                            lineNumber: 297,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                    lineNumber: 282,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, s.id, true, {
                                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                            lineNumber: 153,
                                            columnNumber: 17
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                    lineNumber: 151,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "border-t border-[var(--border)] p-2",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: logout,
                                        className: "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-400 transition-colors hover:bg-red-500/10",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                width: "18",
                                                height: "18",
                                                viewBox: "0 0 24 24",
                                                fill: "none",
                                                stroke: "currentColor",
                                                strokeWidth: "2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                        lineNumber: 309,
                                                        columnNumber: 115
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                                        points: "16 17 21 12 16 7"
                                                    }, void 0, false, {
                                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                        lineNumber: 309,
                                                        columnNumber: 166
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                        x1: "21",
                                                        y1: "12",
                                                        x2: "9",
                                                        y2: "12"
                                                    }, void 0, false, {
                                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                        lineNumber: 309,
                                                        columnNumber: 203
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                lineNumber: 309,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm",
                                                children: "Log Out"
                                            }, void 0, false, {
                                                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                                lineNumber: 310,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                        lineNumber: 308,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                                    lineNumber: 307,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                            lineNumber: 116,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                    lineNumber: 108,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
                lineNumber: 107,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/layout/SettingsPanel.tsx",
        lineNumber: 105,
        columnNumber: 5
    }, this);
}
_s(SettingsPanel, "bxeflXakiEl07CMc0FJldWor25E=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"]
    ];
});
_c = SettingsPanel;
var _c;
__turbopack_context__.k.register(_c, "SettingsPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/layout/PremiumPanel.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PremiumPanel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
const features = [
    {
        icon: "\u{1F4E4}",
        title: "4 GB uploads",
        desc: "Send files up to 4 GB"
    },
    {
        icon: "\u{1F50A}",
        title: "Voice-to-text",
        desc: "Auto transcribe voice messages"
    },
    {
        icon: "\u{1F30D}",
        title: "Unlimited translation",
        desc: "Translate all messages instantly"
    },
    {
        icon: "\u{1F4F7}",
        title: "Stories",
        desc: "Up to 50 active stories"
    },
    {
        icon: "\u{1F3A8}",
        title: "Custom themes",
        desc: "Unlock exclusive themes"
    },
    {
        icon: "\u{1F3AD}",
        title: "Animated avatars",
        desc: "Set animated profile pictures"
    },
    {
        icon: "\u{1F4E2}",
        title: "Channels",
        desc: "Create unlimited channels"
    },
    {
        icon: "\u{1F916}",
        title: "Bots",
        desc: "Create up to 20 bots"
    },
    {
        icon: "\u{1F465}",
        title: "Group calls",
        desc: "Up to 100 participants"
    },
    {
        icon: "\u{1F4DD}",
        title: "Long messages",
        desc: "Up to 8000 characters"
    },
    {
        icon: "\u{1F50D}",
        title: "Advanced search",
        desc: "Filter by date, type, author"
    },
    {
        icon: "\u{26A1}",
        title: "Priority delivery",
        desc: "Messages delivered first"
    }
];
const plans = [
    {
        id: "1month",
        name: "1 месяц",
        price: "499 ₽",
        period: "/мес",
        popular: false
    },
    {
        id: "3months",
        name: "3 месяца",
        price: "999 ₽",
        period: "/3 мес",
        popular: false,
        savings: "333 ₽/мес"
    },
    {
        id: "6months",
        name: "6 месяцев",
        price: "1 499 ₽",
        period: "/6 мес",
        popular: true,
        savings: "250 ₽/мес"
    },
    {
        id: "1year",
        name: "1 год",
        price: "2 399 ₽",
        period: "/год",
        popular: false,
        savings: "200 ₽/мес"
    }
];
function PremiumPanel() {
    _s();
    const { showPremium, togglePremium } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    if (!showPremium) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-40 flex items-center justify-center animate-fade-in",
        onClick: togglePremium,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 bg-[var(--bg-overlay)]"
            }, void 0, false, {
                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative w-full max-w-lg rounded-3xl bg-[var(--bg-card)] p-8 shadow-2xl animate-scale-in",
                onClick: (e)=>e.stopPropagation(),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: togglePremium,
                        className: "absolute top-4 right-4 rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "20",
                            height: "20",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M18 6L6 18M6 6l12 12"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                lineNumber: 35,
                                columnNumber: 109
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                            lineNumber: 35,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                        lineNumber: 34,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-6 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl",
                                style: {
                                    background: "var(--premium-gradient)"
                                },
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "32",
                                    height: "32",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "white",
                                    strokeWidth: "2",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                        points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                        lineNumber: 41,
                                        columnNumber: 104
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                    lineNumber: 41,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                lineNumber: 40,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-2xl font-bold premium-text",
                                children: "Tepla Premium"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                lineNumber: 43,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-sm text-[var(--text-tertiary)]",
                                children: "Unlock the full power of Tepla"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                lineNumber: 44,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3",
                        children: features.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-xl bg-[var(--bg-input)] p-3 text-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-2xl",
                                        children: f.icon
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                        lineNumber: 51,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-xs font-semibold text-[var(--text-primary)]",
                                        children: f.title
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                        lineNumber: 52,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-[var(--text-tertiary)]",
                                        children: f.desc
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                        lineNumber: 53,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, f.title, true, {
                                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                lineNumber: 50,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                        lineNumber: 48,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-3 opacity-50 pointer-events-none select-none",
                        children: plans.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `relative flex-1 rounded-xl border-2 p-4 text-center ${p.popular ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"}`,
                                children: [
                                    p.popular && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white",
                                        children: "BEST"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                        lineNumber: 63,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-[var(--text-tertiary)]",
                                        children: p.name
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                        lineNumber: 65,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-lg font-bold",
                                        children: p.price
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                        lineNumber: 66,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] text-[var(--text-tertiary)]",
                                        children: p.period
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                        lineNumber: 67,
                                        columnNumber: 15
                                    }, this),
                                    p.savings && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-[10px] font-semibold text-emerald-400",
                                        children: p.savings
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                        lineNumber: 68,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, p.id, true, {
                                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                lineNumber: 61,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                        lineNumber: 59,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-4 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-input)] py-5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "28",
                                height: "28",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "var(--text-tertiary)",
                                strokeWidth: "2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                    lineNumber: 75,
                                    columnNumber: 117
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                lineNumber: 75,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm font-semibold text-[var(--text-secondary)]",
                                children: "Premium в разработке"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                lineNumber: 76,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-[var(--text-tertiary)]",
                                children: "Скоро будет доступно. Следите за обновлениями!"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                                lineNumber: 77,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                        lineNumber: 74,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/layout/PremiumPanel.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
_s(PremiumPanel, "RgjDwyCCBRJkRc6gEJayHALT6aQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = PremiumPanel;
var _c;
__turbopack_context__.k.register(_c, "PremiumPanel");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/calls/CallOverlay.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CallOverlay
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/Avatar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function CallOverlay() {
    _s();
    const { showCalls, toggleCalls, chats, activeChatId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const [isMuted, setIsMuted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isVideoOff, setIsVideoOff] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [callTime, setCallTime] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("0:23");
    const chat = chats.find((c)=>c.id === activeChatId);
    if (!showCalls || !chat) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] animate-fade-in",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex w-full max-w-md flex-col items-center gap-6 rounded-3xl bg-[var(--bg-card)] p-8 shadow-2xl animate-scale-in",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                    name: chat.name,
                    src: chat.avatar,
                    size: "xl",
                    showStatus: false
                }, void 0, false, {
                    fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                    lineNumber: 18,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-semibold",
                            children: chat.name
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                            lineNumber: 20,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 text-sm text-emerald-400",
                            children: [
                                "Calling... ",
                                callTime
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                            lineNumber: 21,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                    lineNumber: 19,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setIsMuted(!isMuted),
                            className: `flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isMuted ? "bg-red-500/20 text-red-400" : "bg-[var(--bg-input)] text-[var(--text-primary)]"}`,
                            children: isMuted ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "24",
                                height: "24",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "1",
                                        y1: "1",
                                        x2: "23",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 28,
                                        columnNumber: 115
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 28,
                                        columnNumber: 152
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 28,
                                        columnNumber: 218
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "12",
                                        y1: "19",
                                        x2: "12",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 28,
                                        columnNumber: 288
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "8",
                                        y1: "23",
                                        x2: "16",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 28,
                                        columnNumber: 327
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                lineNumber: 28,
                                columnNumber: 17
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "24",
                                height: "24",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 29,
                                        columnNumber: 115
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M19 10v2a7 7 0 0 1-14 0v-2"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 29,
                                        columnNumber: 179
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "12",
                                        y1: "19",
                                        x2: "12",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 29,
                                        columnNumber: 217
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "8",
                                        y1: "23",
                                        x2: "16",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 29,
                                        columnNumber: 256
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                lineNumber: 29,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                            lineNumber: 26,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setIsVideoOff(!isVideoOff),
                            className: `flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isVideoOff ? "bg-[var(--bg-input)] text-[var(--text-primary)]" : "bg-[var(--accent)] text-white"}`,
                            children: isVideoOff ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "24",
                                height: "24",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "1",
                                        y1: "1",
                                        x2: "23",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 34,
                                        columnNumber: 115
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M21 7l-5 3.5V7a2 2 0 0 0-2-2H5"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 34,
                                        columnNumber: 152
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                        x: "1",
                                        y: "5",
                                        width: "15",
                                        height: "14",
                                        rx: "2"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 34,
                                        columnNumber: 194
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                lineNumber: 34,
                                columnNumber: 17
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "24",
                                height: "24",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                        points: "23 7 16 12 23 17 23 7"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 35,
                                        columnNumber: 115
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                        x: "1",
                                        y: "5",
                                        width: "15",
                                        height: "14",
                                        rx: "2",
                                        ry: "2"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 35,
                                        columnNumber: 156
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                lineNumber: 35,
                                columnNumber: 17
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                            lineNumber: 32,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-input)] text-[var(--text-primary)]",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "24",
                                height: "24",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                        x: "2",
                                        y: "3",
                                        width: "20",
                                        height: "14",
                                        rx: "2",
                                        ry: "2"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 39,
                                        columnNumber: 111
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "8",
                                        y1: "21",
                                        x2: "16",
                                        y2: "21"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 39,
                                        columnNumber: 167
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "12",
                                        y1: "17",
                                        x2: "12",
                                        y2: "21"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 39,
                                        columnNumber: 205
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                lineNumber: 39,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                            lineNumber: 38,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: toggleCalls,
                            className: "flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "24",
                                height: "24",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 43,
                                        columnNumber: 111
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "23",
                                        y1: "1",
                                        x2: "1",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                        lineNumber: 43,
                                        columnNumber: 432
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                                lineNumber: 43,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                            lineNumber: 42,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
                    lineNumber: 25,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
            lineNumber: 17,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/client/src/components/calls/CallOverlay.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_s(CallOverlay, "DVQhfxOx8PfesZWu+58Z+3mEP4Q=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = CallOverlay;
var _c;
__turbopack_context__.k.register(_c, "CallOverlay");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/components/stickers/StickerPicker.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>StickerPicker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
const emojiCategories = [
    {
        name: "Smileys",
        emojis: [
            "\u{1F600}",
            "\u{1F603}",
            "\u{1F604}",
            "\u{1F601}",
            "\u{1F606}",
            "\u{1F605}",
            "\u{1F602}",
            "\u{1F923}",
            "\u{1F60A}",
            "\u{1F607}",
            "\u{1F642}",
            "\u{1F643}",
            "\u{1F609}",
            "\u{1F60C}",
            "\u{1F60D}",
            "\u{1F970}",
            "\u{1F618}",
            "\u{1F617}",
            "\u{1F619}",
            "\u{1F61A}",
            "\u{1F60B}",
            "\u{1F61B}",
            "\u{1F61C}",
            "\u{1F61D}",
            "\u{1F911}",
            "\u{1F917}",
            "\u{1F914}",
            "\u{1F910}",
            "\u{1F928}",
            "\u{1F610}",
            "\u{1F611}",
            "\u{1F636}",
            "\u{1F60F}",
            "\u{1F612}",
            "\u{1F644}",
            "\u{1F62C}",
            "\u{1F925}"
        ]
    },
    {
        name: "Gestures",
        emojis: [
            "\u{1F44D}",
            "\u{1F44E}",
            "\u{1F44A}",
            "\u{270A}",
            "\u{1F91B}",
            "\u{1F91C}",
            "\u{1F44F}",
            "\u{1F64C}",
            "\u{1F450}",
            "\u{1F64F}",
            "\u{1F91D}",
            "\u{1F4AA}",
            "\u{270C}\u{FE0F}",
            "\u{1F918}",
            "\u{1F44C}",
            "\u{1F448}",
            "\u{1F449}",
            "\u{1F446}",
            "\u{1F447}",
            "\u{261D}\u{FE0F}",
            "\u{270B}",
            "\u{1F91A}",
            "\u{1F596}",
            "\u{1F44B}"
        ]
    },
    {
        name: "Hearts",
        emojis: [
            "\u{2764}\u{FE0F}",
            "\u{1F9E1}",
            "\u{1F49B}",
            "\u{1F49A}",
            "\u{1F499}",
            "\u{1F49C}",
            "\u{1F5A4}",
            "\u{1F90D}",
            "\u{1F90E}",
            "\u{1F498}",
            "\u{1F49D}",
            "\u{1F496}",
            "\u{1F497}",
            "\u{1F493}",
            "\u{1F49E}",
            "\u{1F495}",
            "\u{1F48C}"
        ]
    },
    {
        name: "Objects",
        emojis: [
            "\u{1F525}",
            "\u{2B50}",
            "\u{1F31F}",
            "\u{2728}",
            "\u{1F4A5}",
            "\u{1F389}",
            "\u{1F38A}",
            "\u{1F3B5}",
            "\u{1F3B6}",
            "\u{1F680}",
            "\u{1F4AF}",
            "\u{26A1}",
            "\u{1F308}",
            "\u{2600}\u{FE0F}",
            "\u{1F319}",
            "\u{1F4A1}",
            "\u{1F48E}",
            "\u{1F451}",
            "\u{1F947}",
            "\u{1F3C6}",
            "\u{26BD}",
            "\u{1F3AE}",
            "\u{1F3B2}",
            "\u{1F4F1}"
        ]
    },
    {
        name: "Food",
        emojis: [
            "\u{1F34E}",
            "\u{1F34F}",
            "\u{1F350}",
            "\u{1F34A}",
            "\u{1F34B}",
            "\u{1F34C}",
            "\u{1F349}",
            "\u{1F347}",
            "\u{1F353}",
            "\u{1F348}",
            "\u{1F352}",
            "\u{1F351}",
            "\u{1F346}",
            "\u{1F955}",
            "\u{1F33D}",
            "\u{1F336}\u{FE0F}",
            "\u{1F951}",
            "\u{1F966}",
            "\u{1F355}",
            "\u{1F354}",
            "\u{1F32E}",
            "\u{1F37F}",
            "\u{2615}",
            "\u{1F37A}",
            "\u{1F377}"
        ]
    }
];
const mockStickers = [
    {
        id: "st1",
        emoji: "\u{1F44D}",
        label: "Thumbs Up"
    },
    {
        id: "st2",
        emoji: "\u{1F525}",
        label: "Fire"
    },
    {
        id: "st3",
        emoji: "\u{2764}\u{FE0F}",
        label: "Heart"
    },
    {
        id: "st4",
        emoji: "\u{1F602}",
        label: "Laugh"
    },
    {
        id: "st5",
        emoji: "\u{1F60D}",
        label: "Love"
    },
    {
        id: "st6",
        emoji: "\u{1F914}",
        label: "Think"
    },
    {
        id: "st7",
        emoji: "\u{1F680}",
        label: "Rocket"
    },
    {
        id: "st8",
        emoji: "\u{1F389}",
        label: "Party"
    }
];
function StickerPicker() {
    _s();
    const { showStickers, toggleStickers, activeChatId, sendMessage } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const [tab, setTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("emoji");
    const [searchEmoji, setSearchEmoji] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [activeCategory, setActiveCategory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    if (!showStickers || !activeChatId) return null;
    const handleEmojiClick = (emoji)=>{
        sendMessage(activeChatId, emoji);
        toggleStickers();
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "absolute bottom-16 right-4 z-30 w-[340px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl animate-scale-in",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex border-b border-[var(--border)]",
                children: [
                    [
                        "emoji",
                        "stickers",
                        "gif"
                    ].map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setTab(t),
                            className: `flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${tab === t ? "border-b-2 border-[var(--accent)] text-[var(--accent)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`,
                            children: t === "gif" ? "GIF" : t
                        }, t, false, {
                            fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                            lineNumber: 42,
                            columnNumber: 11
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: toggleStickers,
                        className: "px-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "14",
                            height: "14",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M18 6L6 18M6 6l12 12"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                                lineNumber: 47,
                                columnNumber: 109
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                            lineNumber: 47,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                        lineNumber: 46,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-3 py-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    value: searchEmoji,
                    onChange: (e)=>setSearchEmoji(e.target.value),
                    placeholder: `Search ${tab}...`,
                    className: "w-full rounded-lg bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                }, void 0, false, {
                    fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                    lineNumber: 53,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            tab === "emoji" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-1 px-3 pb-1",
                        children: emojiCategories.map((cat, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setActiveCategory(i),
                                className: `rounded-md px-2 py-1 text-[10px] transition-colors ${activeCategory === i ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"}`,
                                children: cat.emojis[0]
                            }, cat.name, false, {
                                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                                lineNumber: 61,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                        lineNumber: 59,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid max-h-[250px] grid-cols-8 gap-0.5 overflow-y-auto px-2 pb-2",
                        children: emojiCategories[activeCategory].emojis.filter((e)=>!searchEmoji || e.includes(searchEmoji)).map((emoji)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>handleEmojiClick(emoji),
                                className: "flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-[var(--bg-hover)]",
                                children: emoji
                            }, emoji, false, {
                                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                                lineNumber: 71,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                        lineNumber: 67,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true),
            tab === "stickers" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid max-h-[280px] grid-cols-4 gap-2 overflow-y-auto p-3",
                children: mockStickers.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>{
                            sendMessage(activeChatId, s.emoji, "sticker");
                            toggleStickers();
                        },
                        className: "flex h-16 items-center justify-center rounded-xl bg-[var(--bg-input)] text-3xl transition-transform hover:scale-105 hover:bg-[var(--bg-hover)]",
                        children: s.emoji
                    }, s.id, false, {
                        fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                        lineNumber: 82,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                lineNumber: 80,
                columnNumber: 9
            }, this),
            tab === "gif" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex max-h-[280px] flex-col items-center justify-center gap-2 p-8 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        width: "40",
                        height: "40",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "var(--text-tertiary)",
                        strokeWidth: "1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                x: "2",
                                y: "2",
                                width: "20",
                                height: "20",
                                rx: "5"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                                lineNumber: 91,
                                columnNumber: 119
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M9 10h1v4H9v-2H8v2H7v-4h1v1h1z"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                                lineNumber: 91,
                                columnNumber: 168
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M13 10v4h2v-1h-1v-3z"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                                lineNumber: 91,
                                columnNumber: 210
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M17 10v4"
                            }, void 0, false, {
                                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                                lineNumber: 91,
                                columnNumber: 242
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                        lineNumber: 91,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-[var(--text-tertiary)]",
                        children: "Search for GIFs"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                        lineNumber: 92,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-[var(--text-tertiary)]",
                        children: "Powered by Giphy"
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                        lineNumber: 93,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
                lineNumber: 90,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/stickers/StickerPicker.tsx",
        lineNumber: 38,
        columnNumber: 5
    }, this);
}
_s(StickerPicker, "DkdUSGSTkAPVYVL22ZsOtXIG7CE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"]
    ];
});
_c = StickerPicker;
var _c;
__turbopack_context__.k.register(_c, "StickerPicker");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/client/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/auth-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/chat-store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/layout/Sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$ChatArea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/layout/ChatArea.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$EmptyChat$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/chat/EmptyChat.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$SettingsPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/layout/SettingsPanel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$PremiumPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/layout/PremiumPanel.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$calls$2f$CallOverlay$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/calls/CallOverlay.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$stickers$2f$StickerPicker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/stickers/StickerPicker.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
function Home() {
    _s();
    const { user, isLoading, hydrate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])();
    const { chats, activeChatId, setActiveChat, messages, loadChats, bindSocket } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Home.useEffect": ()=>{
            hydrate();
        }
    }["Home.useEffect"], [
        hydrate
    ]);
    // Once authenticated, load chats from API and bind socket events
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Home.useEffect": ()=>{
            if (!isLoading && user) {
                loadChats();
                bindSocket();
            }
        }
    }["Home.useEffect"], [
        user,
        isLoading,
        loadChats,
        bindSocket
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Home.useEffect": ()=>{
            if (!isLoading && !user) router.push("/login");
        }
    }["Home.useEffect"], [
        user,
        isLoading,
        router
    ]);
    if (isLoading || !user) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex h-screen items-center justify-center bg-[var(--bg-main)]",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "h-10 w-10 animate-spin rounded-full border-3 border-[var(--accent)] border-t-transparent"
                    }, void 0, false, {
                        fileName: "[project]/client/src/app/page.tsx",
                        lineNumber: 37,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-sm text-[var(--text-tertiary)]",
                        children: "Loading Tepla..."
                    }, void 0, false, {
                        fileName: "[project]/client/src/app/page.tsx",
                        lineNumber: 38,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/app/page.tsx",
                lineNumber: 36,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/client/src/app/page.tsx",
            lineNumber: 35,
            columnNumber: 7
        }, this);
    }
    const activeChat = chats.find((c)=>c.id === activeChatId) ?? null;
    const activeMessages = activeChatId ? messages[activeChatId] ?? [] : [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "flex h-screen overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `w-full shrink-0 md:block md:w-[340px] lg:w-[360px] md:border-r md:border-[var(--border)] ${activeChatId ? "hidden" : "block"}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                    fileName: "[project]/client/src/app/page.tsx",
                    lineNumber: 51,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/app/page.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `relative min-w-0 flex-1 ${activeChatId ? "block" : "hidden md:block"}`,
                children: [
                    activeChat ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$ChatArea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                        chat: activeChat,
                        messages: activeMessages,
                        currentUserId: user.id,
                        onBack: ()=>setActiveChat(null)
                    }, void 0, false, {
                        fileName: "[project]/client/src/app/page.tsx",
                        lineNumber: 57,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$chat$2f$EmptyChat$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/client/src/app/page.tsx",
                        lineNumber: 59,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$stickers$2f$StickerPicker$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/client/src/app/page.tsx",
                        lineNumber: 63,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/app/page.tsx",
                lineNumber: 55,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$SettingsPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/client/src/app/page.tsx",
                lineNumber: 67,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$layout$2f$PremiumPanel$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/client/src/app/page.tsx",
                lineNumber: 68,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$calls$2f$CallOverlay$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/client/src/app/page.tsx",
                lineNumber: 69,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/app/page.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_s(Home, "WZ91mHc8P+W+BrVujMeEmg0uhmk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$chat$2d$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useChatStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = Home;
var _c;
__turbopack_context__.k.register(_c, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=client_src_62f9995b._.js.map