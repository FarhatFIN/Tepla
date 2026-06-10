"use client";
import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import Avatar from "@/components/ui/Avatar";
import { languages } from "@/lib/countries";
import api from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function deviceInfo(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  const browser = ua.includes("Edg") ? "Edge" : ua.includes("OPR") ? "Opera" : ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Browser";
  const os = ua.includes("Windows") ? "Windows" : ua.includes("Mac") ? "macOS" : ua.includes("Android") ? "Android" : ua.includes("iPhone") || ua.includes("iPad") ? "iOS" : ua.includes("Linux") ? "Linux" : "Unknown OS";
  return `${os} - ${browser}`;
}

export default function SettingsPanel() {
  const { showSettings, toggleSettings, folders, loadFolders, createFolder, deleteFolder } = useChatStore();
  const { user, language, setLanguage, setUsername, setAvatar, setBio, setBirthDate, logout, savedAccounts, switchAccount } = useAuthStore();
  const settings = useSettingsStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [newBirthDate, setNewBirthDate] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "saved">("idle");
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation();

  // Storage state (real numbers from the browser)
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Folder creation
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Admin panel state
  const [adminMaintenanceMode, setAdminMaintenanceMode] = useState(false);
  const [adminRegistrationOpen, setAdminRegistrationOpen] = useState(true);
  const [adminMaxFileSize, setAdminMaxFileSize] = useState(100);
  const [adminBroadcastText, setAdminBroadcastText] = useState("");

  // Apply font size globally (rem-based sizes follow the root)
  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontSize}px`;
  }, [settings.fontSize]);

  // Real storage usage when the section opens
  useEffect(() => {
    if (activeSection !== "storage") return;
    navigator.storage?.estimate?.()
      .then((est) => setStorageUsage({ usage: est.usage || 0, quota: est.quota || 0 }))
      .catch(() => {});
  }, [activeSection]);

  // Real folders when the section opens
  useEffect(() => {
    if (activeSection === "folders") loadFolders();
  }, [activeSection, loadFolders]);

  async function clearCache() {
    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      const est = await navigator.storage?.estimate?.();
      if (est) setStorageUsage({ usage: est.usage || 0, quota: est.quota || 0 });
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2000);
    } catch { /* ignore */ }
  }

  function handleAvatarChange(file: File) {
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setAvatar(dataUrl);
      }
      setAvatarUploading(false);
    };
    reader.onerror = () => setAvatarUploading(false);
    reader.readAsDataURL(file);
  }

  function handleUsernameEdit() {
    setNewUsername(user?.username || "");
    setEditingUsername(true);
    setUsernameStatus("idle");
  }

  function handleUsernameChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setNewUsername(clean);
    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current);
    if (clean.length < 4 || clean === user?.username) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    // Debounced real availability check against the search API
    usernameCheckRef.current = setTimeout(async () => {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>(`/search?type=users&q=${encodeURIComponent(clean)}`);
        const taken = (res.data || []).some((u) => u.username?.toLowerCase() === clean && u.id !== user?.id);
        setUsernameStatus(taken ? "taken" : "available");
      } catch {
        // API unavailable — allow saving, the server validates on submit
        setUsernameStatus("available");
      }
    }, 400);
  }

  function handleUsernameSave() {
    if (newUsername.length < 4 || usernameStatus === "taken") return;
    setUsername(newUsername);
    setUsernameStatus("saved");
    setTimeout(() => { setEditingUsername(false); setUsernameStatus("idle"); }, 1000);
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    await createFolder(name);
    setNewFolderName("");
    setCreatingFolder(false);
  }

  if (!showSettings) return null;

  const sections = [
    { id: "general", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, label: t("general") },
    { id: "notifications", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label: t("notifications") },
    { id: "privacy", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, label: t("privacy_security") },
    { id: "language", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, label: t("language_translation") },
    { id: "storage", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>, label: t("storage_data") },
    { id: "devices", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, label: t("devices") },
    { id: "folders", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, label: t("chat_folders") },
    ...(user?.isAdmin ? [{ id: "admin", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: t("admin_panel") }] : []),
  ];

  function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
      <button onClick={() => onChange(!on)} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-[var(--accent)]" : "bg-[var(--bg-input)]"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    );
  }

  function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
        {children}
      </div>
    );
  }

  function RadioGroup({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: any) => void }) {
    return (
      <div className="flex gap-1">
        {options.map((o) => (
          <button key={o.value} onClick={() => onChange(o.value)} className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${value === o.value ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  const privacyOptions = [
    { value: "everyone", label: t("everyone") },
    { value: "contacts", label: t("contacts") },
    { value: "nobody", label: t("nobody") },
  ];

  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in" onClick={toggleSettings}>
      <div className="absolute inset-0 bg-[var(--bg-overlay)]" />
      <div className="relative ml-auto flex h-full w-full max-w-md shadow-2xl animate-slide-in-right" style={{ background: "rgba(30,21,53,0.98)", backdropFilter: "blur(24px)", borderLeft: "1px solid rgba(108,61,232,0.2)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex h-full w-full flex-col">
          <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
            <button onClick={toggleSettings} className="rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <h2 className="text-lg font-semibold">{t("settings")}</h2>
          </header>

          <div className="flex-1 overflow-y-auto">
            {/* Profile card */}
            <div className="flex items-center gap-4 border-b border-[var(--border)] p-4">
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleAvatarChange(e.target.files[0]); e.target.value = ""; }} />
              <button onClick={() => avatarInputRef.current?.click()} className="relative group shrink-0" disabled={avatarUploading}>
                <Avatar name={user?.name || "User"} size="lg" status="online" src={user?.avatar} />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarUploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  )}
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold">{user?.name || "User"}</h3>
                  {user?.isVerified && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                  )}
                  {user?.isAdmin && (
                    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "linear-gradient(135deg, #6C3DE8, #00D46A)" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      Admin
                    </span>
                  )}
                </div>
                {!editingUsername ? (
                  <button onClick={handleUsernameEdit} className="group flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors">
                    <span>@{user?.username || "set_username"}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-0 group-hover:opacity-100 transition-opacity"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-[var(--text-tertiary)]">@</span>
                    <input type="text" value={newUsername} onChange={(e) => handleUsernameChange(e.target.value)} maxLength={32} autoFocus
                      className="w-24 bg-[var(--bg-input)] rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      onKeyDown={(e) => { if (e.key === "Enter") handleUsernameSave(); if (e.key === "Escape") { setEditingUsername(false); setUsernameStatus("idle"); } }}
                    />
                    {usernameStatus === "checking" && <div className="h-3 w-3 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />}
                    {usernameStatus === "available" && (
                      <button onClick={handleUsernameSave} className="text-[#00D46A]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    )}
                    {usernameStatus === "taken" && <span className="text-[10px] text-red-400">taken</span>}
                    {usernameStatus === "saved" && <span className="text-[10px] text-[#00D46A]">saved!</span>}
                    <button onClick={() => { setEditingUsername(false); setUsernameStatus("idle"); }} className="text-[var(--text-tertiary)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bio & Birthday */}
            <div className="border-b border-[var(--border)] px-4 py-3 space-y-3">
              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("bio") || "Bio"}</span>
                  {!editingBio && (
                    <button onClick={() => { setNewBio(user?.bio || ""); setEditingBio(true); }} className="text-[10px] text-[var(--accent)] hover:underline">
                      {user?.bio ? t("edit") || "Edit" : t("add") || "Add"}
                    </button>
                  )}
                </div>
                {editingBio ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={newBio}
                      onChange={(e) => setNewBio(e.target.value.slice(0, 200))}
                      maxLength={200}
                      rows={3}
                      autoFocus
                      placeholder={t("tell_about_yourself") || "Tell about yourself..."}
                      className="w-full resize-none rounded-lg bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--text-tertiary)]"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-tertiary)]">{newBio.length}/200</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => setEditingBio(false)} className="rounded-lg px-2.5 py-1 text-xs text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
                          {t("cancel") || "Cancel"}
                        </button>
                        <button onClick={() => { setBio(newBio); setEditingBio(false); }} className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs text-white hover:opacity-90">
                          {t("save") || "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    {user?.bio || <span className="italic text-[var(--text-tertiary)]">{t("no_bio") || "No bio yet"}</span>}
                  </p>
                )}
              </div>

              {/* Birthday */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("birthday") || "Birthday"}</span>
                  {!editingBirthDate && (
                    <button onClick={() => { setNewBirthDate(user?.birthDate || ""); setEditingBirthDate(true); }} className="text-[10px] text-[var(--accent)] hover:underline">
                      {user?.birthDate ? t("edit") || "Edit" : t("add") || "Add"}
                    </button>
                  )}
                </div>
                {editingBirthDate ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newBirthDate}
                      onChange={(e) => setNewBirthDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      min="1900-01-01"
                      autoFocus
                      className="rounded-lg bg-[var(--bg-input)] px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] [color-scheme:dark]"
                    />
                    <button onClick={() => setEditingBirthDate(false)} className="rounded-lg px-2 py-1 text-xs text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
                      {t("cancel") || "Cancel"}
                    </button>
                    <button onClick={() => { if (newBirthDate) setBirthDate(newBirthDate); setEditingBirthDate(false); }} className="rounded-lg bg-[var(--accent)] px-2 py-1 text-xs text-white hover:opacity-90">
                      {t("save") || "Save"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {user?.birthDate ? (
                      <span>{new Intl.DateTimeFormat(language || "en", { day: "numeric", month: "long", year: "numeric" }).format(new Date(user.birthDate))}</span>
                    ) : (
                      <span className="italic text-[var(--text-tertiary)]">{t("not_set") || "Not set"}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sections */}
            <div className="p-2">
              {sections.map((s) => (
                <div key={s.id}>
                  <button onClick={() => setActiveSection(activeSection === s.id ? null : s.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]">
                    <span className="text-[var(--text-tertiary)]">{s.icon}</span>
                    <span className="flex-1 text-sm">{s.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[var(--text-tertiary)] transition-transform ${activeSection === s.id ? "rotate-90" : ""}`}><polyline points="9 18 15 12 9 6"/></svg>
                  </button>

                  {/* General */}
                  {activeSection === "general" && s.id === "general" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <SettingRow label={t("font_size")}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => settings.update({ fontSize: Math.max(12, settings.fontSize - 1) })} className="rounded bg-[var(--bg-main)] px-2 py-0.5 text-xs hover:bg-[var(--bg-hover)]">-</button>
                          <span className="text-xs w-6 text-center">{settings.fontSize}</span>
                          <button onClick={() => settings.update({ fontSize: Math.min(20, settings.fontSize + 1) })} className="rounded bg-[var(--bg-main)] px-2 py-0.5 text-xs hover:bg-[var(--bg-hover)]">+</button>
                        </div>
                      </SettingRow>
                      <SettingRow label={t("send_by_enter")}><Toggle on={settings.sendByEnter} onChange={(v) => settings.update({ sendByEnter: v })} /></SettingRow>
                      <SettingRow label={t("animated_emoji")}><Toggle on={settings.animatedEmoji} onChange={(v) => settings.update({ animatedEmoji: v })} /></SettingRow>
                    </div>
                  )}

                  {/* Notifications */}
                  {activeSection === "notifications" && s.id === "notifications" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("private_chats")}</p>
                      <SettingRow label={t("sound")}><Toggle on={settings.notifSound} onChange={(v) => settings.update({ notifSound: v })} /></SettingRow>
                      <SettingRow label={t("message_preview")}><Toggle on={settings.notifPreview} onChange={(v) => settings.update({ notifPreview: v })} /></SettingRow>
                      <SettingRow label={t("push_notifications")}><Toggle on={settings.notifPush} onChange={(v) => settings.update({ notifPush: v })} /></SettingRow>
                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("groups_channels")}</p>
                      <SettingRow label={t("sound")}><Toggle on={settings.notifGroupSound} onChange={(v) => settings.update({ notifGroupSound: v })} /></SettingRow>
                    </div>
                  )}

                  {/* Privacy & Security */}
                  {activeSection === "privacy" && s.id === "privacy" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("who_can_see")}</p>
                      <SettingRow label={t("last_seen_label")}><RadioGroup value={settings.privacyLastSeen} options={privacyOptions} onChange={(v) => settings.update({ privacyLastSeen: v })} /></SettingRow>
                      <SettingRow label={t("phone_number")}><RadioGroup value={settings.privacyPhone} options={privacyOptions} onChange={(v) => settings.update({ privacyPhone: v })} /></SettingRow>
                      <SettingRow label={t("profile_photo")}><RadioGroup value={settings.privacyPhoto} options={privacyOptions} onChange={(v) => settings.update({ privacyPhoto: v })} /></SettingRow>
                      <SettingRow label={t("forwarded_messages")}><RadioGroup value={settings.privacyForwards} options={privacyOptions} onChange={(v) => settings.update({ privacyForwards: v })} /></SettingRow>
                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("security")}</p>
                      <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors mb-1.5">
                        {t("two_factor_auth")}
                        <span className="block text-[10px] text-[var(--text-tertiary)]">{t("extra_security")}</span>
                      </button>
                      <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors mb-1.5">
                        {t("active_sessions")}
                        <span className="block text-[10px] text-[var(--text-tertiary)]">{t("manage_devices")}</span>
                      </button>
                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("passcode_lock")}</p>
                      {localStorage.getItem("tepla-passcode") ? (
                        <button onClick={() => { localStorage.removeItem("tepla-passcode"); localStorage.removeItem("tepla-passcode-length"); localStorage.removeItem("tepla-auto-lock"); }} className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/20 transition-colors mb-1.5">
                          {t("remove_passcode")}
                        </button>
                      ) : (
                        <button onClick={() => setActiveSection("passcode-setup")} className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors mb-1.5">
                          {t("set_passcode")}
                          <span className="block text-[10px] text-[var(--text-tertiary)]">{t("passcode_lock_desc")}</span>
                        </button>
                      )}
                      <SettingRow label={t("auto_lock")}>
                        <select value={localStorage.getItem("tepla-auto-lock") || "0"} onChange={(e) => localStorage.setItem("tepla-auto-lock", e.target.value)} className="rounded bg-[var(--bg-main)] px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none">
                          <option value="0">{t("disabled")}</option>
                          <option value="60">{t("1_minute")}</option>
                          <option value="300">{t("5_minutes")}</option>
                          <option value="3600">{t("1_hour")}</option>
                          <option value="18000">{t("5_hours")}</option>
                        </select>
                      </SettingRow>
                      <div className="my-2 border-t border-[var(--border)]" />
                      <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                        {t("delete_account")}
                        <span className="block text-[10px] text-red-400/60">{t("delete_account_desc")}</span>
                      </button>
                    </div>
                  )}

                  {/* Language */}
                  {activeSection === "language" && s.id === "language" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-xs text-[var(--text-tertiary)]">{t("auto_translate_to")}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {languages.map((l) => (
                          <button key={l.code} onClick={() => setLanguage(l.code)} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${language === l.code ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--bg-hover)]"}`}>
                            <span>{l.flag}</span><span>{l.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Storage & Data */}
                  {activeSection === "storage" && s.id === "storage" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("auto_download")}</p>
                      <SettingRow label={t("photos")}><Toggle on={settings.autoDownloadPhotos} onChange={(v) => settings.update({ autoDownloadPhotos: v })} /></SettingRow>
                      <SettingRow label={t("videos")}><Toggle on={settings.autoDownloadVideos} onChange={(v) => settings.update({ autoDownloadVideos: v })} /></SettingRow>
                      <SettingRow label={t("files")}><Toggle on={settings.autoDownloadFiles} onChange={(v) => settings.update({ autoDownloadFiles: v })} /></SettingRow>
                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("storage_usage")}</p>
                      {storageUsage ? (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-[var(--text-secondary)]">{t("storage_usage")}</span>
                            <span className="text-[var(--text-tertiary)]">{formatBytes(storageUsage.usage)}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-main)]">
                            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, (storageUsage.usage / Math.max(storageUsage.quota, 1)) * 100).toFixed(2)}%` }} />
                          </div>
                          <div className="flex justify-between text-xs font-medium pt-1 border-t border-[var(--border)]">
                            <span className="text-[var(--text-primary)]">{t("total")}</span>
                            <span className="text-[var(--text-primary)]">{formatBytes(storageUsage.usage)} / {formatBytes(storageUsage.quota)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-tertiary)]">…</p>
                      )}
                      <button onClick={clearCache} className="mt-3 w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-colors">
                        {cacheCleared ? "✓" : t("clear_cache")}
                      </button>
                    </div>
                  )}

                  {/* Devices */}
                  {activeSection === "devices" && s.id === "devices" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("current_device")}</p>
                      <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-main)] p-2.5 mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(0,212,106,0.15)] text-[#00D46A]">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium">{t("this_device")}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{deviceInfo()}</p>
                          <p className="text-[10px] text-[#00D46A]">{t("online_now")}</p>
                        </div>
                      </div>
                      <button className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-colors">
                        {t("terminate_sessions")}
                      </button>
                    </div>
                  )}

                  {/* Admin Panel */}
                  {activeSection === "admin" && s.id === "admin" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">{t("admin_controls")}</span>
                      </div>

                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("server")}</p>
                      <SettingRow label={t("maintenance_mode")}><Toggle on={adminMaintenanceMode} onChange={setAdminMaintenanceMode} /></SettingRow>
                      <SettingRow label={t("open_registration")}><Toggle on={adminRegistrationOpen} onChange={setAdminRegistrationOpen} /></SettingRow>
                      <SettingRow label={t("max_file_size")}>
                        <div className="flex items-center gap-2">
                          <input type="number" value={adminMaxFileSize} onChange={(e) => setAdminMaxFileSize(Number(e.target.value))} className="w-16 rounded bg-[var(--bg-main)] px-2 py-0.5 text-xs text-center text-[var(--text-primary)] outline-none" />
                        </div>
                      </SettingRow>

                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("broadcast")}</p>
                      <textarea value={adminBroadcastText} onChange={(e) => setAdminBroadcastText(e.target.value)} placeholder={t("message_to_all")} rows={2}
                        className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none resize-none mb-2" />
                      <button onClick={() => { if (adminBroadcastText.trim()) { alert("Broadcast sent: " + adminBroadcastText); setAdminBroadcastText(""); } }}
                        className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
                        {t("send_broadcast")}
                      </button>
                    </div>
                  )}

                  {/* Chat Folders — real folders from the store */}
                  {activeSection === "folders" && s.id === "folders" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">{t("your_folders")}</p>
                      {folders.length === 0 && (
                        <p className="mb-1.5 text-xs italic text-[var(--text-tertiary)]">{t("no_folders") || "No folders yet"}</p>
                      )}
                      {folders.map((f) => (
                        <div key={f.id} className="flex items-center justify-between rounded-lg bg-[var(--bg-main)] px-3 py-2.5 mb-1.5">
                          <div className="flex items-center gap-2">
                            {f.icon && <span>{f.icon}</span>}
                            <span className="text-xs font-medium">{f.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--text-tertiary)]">{t("chats_count", { count: f.chatIds.length })}</span>
                            <button onClick={() => deleteFolder(f.id)} className="text-[var(--text-tertiary)] hover:text-red-400 transition-colors" title={t("delete") || "Delete"}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="mt-2 flex gap-1.5">
                        <input
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value.slice(0, 32))}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
                          placeholder={t("create_new_folder")}
                          className="flex-1 rounded-lg border border-dashed border-[var(--border)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--accent)] focus:border-[var(--accent)]"
                        />
                        <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
                          {creatingFolder ? "…" : "+"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Account switcher */}
            {savedAccounts.length > 1 && (
              <div className="border-t border-[var(--border)] p-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-[var(--text-tertiary)] tracking-wider">{t("switch_account")}</p>
                {savedAccounts.filter((a) => a.user.id !== user?.id).map((acc) => (
                  <button key={acc.user.id} onClick={() => { switchAccount(acc.user.id); toggleSettings(); window.location.reload(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)]">
                    {acc.user.avatar ? (
                      <img src={acc.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
                        {acc.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{acc.user.name}</p>
                      <p className="truncate text-[10px] text-[var(--text-tertiary)]">@{acc.user.username}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
            )}

            {/* Logout */}
            <div className="border-t border-[var(--border)] p-2">
              <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-400 transition-colors hover:bg-red-500/10">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span className="text-sm">{t("log_out")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
