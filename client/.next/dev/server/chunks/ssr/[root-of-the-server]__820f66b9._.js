module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/client/src/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "api",
    ()=>api,
    "default",
    ()=>__TURBOPACK__default__export__
]);
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v2";
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
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/child_process [external] (child_process, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("child_process", () => require("child_process"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/tty [external] (tty, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tty", () => require("tty"));

module.exports = mod;
}),
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/os [external] (os, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("os", () => require("os"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[project]/client/src/lib/mock-data.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/client/src/stores/chat-store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useChatStore",
    ()=>useChatStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/mock-data.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/socket.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/auth-store.ts [app-ssr] (ecmascript)");
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
const useChatStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        chats: [],
        messages: {},
        activeChatId: null,
        activeThreadId: null,
        folders: __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mockFolders"],
        activeFolderId: null,
        stories: __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$mock$2d$data$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mockStories"],
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
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get("/chats");
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
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(`/messages?chatId=${chatId}&limit=50`);
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
            const socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getSocket"])();
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
                const myId = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuthStore"].getState().user?.id;
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
                const myId = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuthStore"].getState().user?.id;
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
                const myId = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuthStore"].getState().user?.id;
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
                const socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getSocket"])();
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
            const authUser = __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuthStore"].getState().user;
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
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post("/messages", {
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
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post("/messages/read", {
                chatId
            }).catch((err)=>console.warn("[chat-store] markAsRead failed:", err));
        },
        forwardMessage: (messageId, toChatId)=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post("/messages/forward", {
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
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].patch(`/messages/${messageId}/pin`).catch((err)=>console.warn("[chat-store] pinMessage failed:", err));
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
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].delete(`/messages/${messageId}`).catch((err)=>console.warn("[chat-store] deleteMessage failed:", err));
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
}),
"[project]/client/src/lib/socket.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "connectSocket",
    ()=>connectSocket,
    "disconnectSocket",
    ()=>disconnectSocket,
    "getSocket",
    ()=>getSocket
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2d$debug$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/client/node_modules/socket.io-client/build/esm-debug/index.js [app-ssr] (ecmascript) <locals>");
;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3100";
let socket = null;
function connectSocket(token) {
    if (socket?.connected) return socket;
    socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2d$debug$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])(WS_URL, {
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
            const { useChatStore } = __turbopack_context__.r("[project]/client/src/stores/chat-store.ts [app-ssr] (ecmascript)");
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
}),
"[project]/client/src/stores/auth-store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAuthStore",
    ()=>useAuthStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/lib/socket.ts [app-ssr] (ecmascript)");
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
const useAuthStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
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
                        __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].setToken(data.token);
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["connectSocket"])(data.token);
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
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post("/auth/login", {
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
                __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].setToken(accessToken);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["connectSocket"])(accessToken);
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
                const res = await __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post("/auth/register/email", {
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
                __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].setToken(accessToken);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["connectSocket"])(accessToken);
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
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].setToken(null);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$socket$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["disconnectSocket"])();
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
            __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].patch("/users/" + user.id, {
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
}),
"[project]/client/src/components/ui/Input.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Input
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
function Input({ label, error, isPassword, type, className = "", ...props }) {
    const [show, setShow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const inputType = isPassword ? show ? "text" : "password" : type;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-1.5",
        children: [
            label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "text-sm font-medium text-[var(--text-secondary)]",
                children: label
            }, void 0, false, {
                fileName: "[project]/client/src/components/ui/Input.tsx",
                lineNumber: 16,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: inputType,
                        className: `w-full rounded-xl bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--accent)] ${error ? "ring-red-500" : ""} ${className}`,
                        ...props
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/ui/Input.tsx",
                        lineNumber: 18,
                        columnNumber: 9
                    }, this),
                    isPassword && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setShow((v)=>!v),
                        className: "absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
                        "aria-label": show ? "Hide" : "Show",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "18",
                            height: "18",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            children: show ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/ui/Input.tsx",
                                        lineNumber: 26,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/ui/Input.tsx",
                                        lineNumber: 26,
                                        columnNumber: 116
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "1",
                                        y1: "1",
                                        x2: "23",
                                        y2: "23"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/ui/Input.tsx",
                                        lineNumber: 26,
                                        columnNumber: 198
                                    }, this)
                                ]
                            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/ui/Input.tsx",
                                        lineNumber: 26,
                                        columnNumber: 243
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                        cx: "12",
                                        cy: "12",
                                        r: "3"
                                    }, void 0, false, {
                                        fileName: "[project]/client/src/components/ui/Input.tsx",
                                        lineNumber: 26,
                                        columnNumber: 299
                                    }, this)
                                ]
                            }, void 0, true)
                        }, void 0, false, {
                            fileName: "[project]/client/src/components/ui/Input.tsx",
                            lineNumber: 25,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/client/src/components/ui/Input.tsx",
                        lineNumber: 24,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/components/ui/Input.tsx",
                lineNumber: 17,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-xs text-red-500",
                children: error
            }, void 0, false, {
                fileName: "[project]/client/src/components/ui/Input.tsx",
                lineNumber: 31,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/components/ui/Input.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
}),
"[project]/client/src/hooks/useTheme.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useTheme",
    ()=>useTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
function useTheme() {
    const [theme, setTheme] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("dark");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const saved = localStorage.getItem("tepla-theme");
        const initial = saved || "dark";
        setTheme(initial);
        document.documentElement.classList.toggle("dark", initial === "dark");
    }, []);
    const toggleTheme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setTheme((prev)=>{
            const next = prev === "dark" ? "light" : "dark";
            document.documentElement.classList.toggle("dark", next === "dark");
            localStorage.setItem("tepla-theme", next);
            return next;
        });
    }, []);
    return {
        theme,
        toggleTheme
    };
}
}),
"[project]/client/src/app/login/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LoginPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/stores/auth-store.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/components/ui/Input.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$hooks$2f$useTheme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/client/src/hooks/useTheme.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
function LoginPage() {
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const { login } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$stores$2f$auth$2d$store$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuthStore"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const { theme, toggleTheme } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$hooks$2f$useTheme$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTheme"])();
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!email || !email.includes("@")) {
            setError("Enter a valid email");
            return;
        }
        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        setLoading(true);
        const ok = await login(email, password);
        setLoading(false);
        if (ok) router.push("/");
        else setError("Invalid credentials");
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-screen flex-col items-center justify-center bg-[var(--bg-main)] px-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: toggleTheme,
                className: "absolute top-4 right-4 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                children: theme === "dark" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    width: "20",
                    height: "20",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: "12",
                            cy: "12",
                            r: "5"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 34,
                            columnNumber: 111
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                            x1: "12",
                            y1: "1",
                            x2: "12",
                            y2: "3"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 34,
                            columnNumber: 142
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                            x1: "12",
                            y1: "21",
                            x2: "12",
                            y2: "23"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 34,
                            columnNumber: 179
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                            x1: "4.22",
                            y1: "4.22",
                            x2: "5.64",
                            y2: "5.64"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 34,
                            columnNumber: 218
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                            x1: "18.36",
                            y1: "18.36",
                            x2: "19.78",
                            y2: "19.78"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 34,
                            columnNumber: 265
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                            x1: "1",
                            y1: "12",
                            x2: "3",
                            y2: "12"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 34,
                            columnNumber: 316
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                            x1: "21",
                            y1: "12",
                            x2: "23",
                            y2: "12"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 34,
                            columnNumber: 353
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/client/src/app/login/page.tsx",
                    lineNumber: 34,
                    columnNumber: 13
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    width: "20",
                    height: "20",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                    }, void 0, false, {
                        fileName: "[project]/client/src/app/login/page.tsx",
                        lineNumber: 35,
                        columnNumber: 111
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/client/src/app/login/page.tsx",
                    lineNumber: 35,
                    columnNumber: 13
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/app/login/page.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-8 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-4xl font-bold gradient-text",
                        children: "Tepla"
                    }, void 0, false, {
                        fileName: "[project]/client/src/app/login/page.tsx",
                        lineNumber: 39,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2 text-sm text-[var(--text-tertiary)]",
                        children: "Encrypted messenger for everyone"
                    }, void 0, false, {
                        fileName: "[project]/client/src/app/login/page.tsx",
                        lineNumber: 40,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/client/src/app/login/page.tsx",
                lineNumber: 38,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full max-w-sm rounded-2xl bg-[var(--bg-sidebar)] p-6 shadow-lg",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: "flex flex-col gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-center text-xl font-semibold",
                            children: "Sign In"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 45,
                            columnNumber: 11
                        }, this),
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-400",
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 46,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            label: "Email",
                            type: "email",
                            placeholder: "your@email.com",
                            value: email,
                            onChange: (e)=>setEmail(e.target.value),
                            autoComplete: "email"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 47,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$src$2f$components$2f$ui$2f$Input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            label: "Password",
                            isPassword: true,
                            placeholder: "Min 6 characters",
                            value: password,
                            onChange: (e)=>setPassword(e.target.value),
                            autoComplete: "current-password"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 48,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: loading,
                            className: "mt-2 flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60",
                            children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                            }, void 0, false, {
                                fileName: "[project]/client/src/app/login/page.tsx",
                                lineNumber: 50,
                                columnNumber: 24
                            }, this) : "Sign In"
                        }, void 0, false, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 49,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-center text-sm text-[var(--text-tertiary)]",
                            children: [
                                "No account? ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$client$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/register",
                                    className: "text-[var(--accent)] hover:underline",
                                    children: "Register"
                                }, void 0, false, {
                                    fileName: "[project]/client/src/app/login/page.tsx",
                                    lineNumber: 53,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/client/src/app/login/page.tsx",
                            lineNumber: 52,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/client/src/app/login/page.tsx",
                    lineNumber: 44,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/client/src/app/login/page.tsx",
                lineNumber: 43,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/client/src/app/login/page.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__820f66b9._.js.map