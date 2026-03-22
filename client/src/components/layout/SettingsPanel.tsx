"use client";
import { useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";
import Avatar from "@/components/ui/Avatar";
import { languages } from "@/lib/countries";
import api from "@/lib/api";

export default function SettingsPanel() {
  const { showSettings, toggleSettings } = useChatStore();
  const { user, language, setLanguage, setUsername, setAvatar, logout, savedAccounts, switchAccount } = useAuthStore();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "saved">("idle");

  // Settings state
  const [notifSound, setNotifSound] = useState(true);
  const [notifPreview, setNotifPreview] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifGroupSound, setNotifGroupSound] = useState(true);
  const [privacyLastSeen, setPrivacyLastSeen] = useState<"everyone" | "contacts" | "nobody">("everyone");
  const [privacyPhone, setPrivacyPhone] = useState<"everyone" | "contacts" | "nobody">("nobody");
  const [privacyPhoto, setPrivacyPhoto] = useState<"everyone" | "contacts" | "nobody">("everyone");
  const [privacyForwards, setPrivacyForwards] = useState<"everyone" | "contacts" | "nobody">("everyone");
  const [autoDownloadPhotos, setAutoDownloadPhotos] = useState(true);
  const [autoDownloadVideos, setAutoDownloadVideos] = useState(false);
  const [autoDownloadFiles, setAutoDownloadFiles] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [sendByEnter, setSendByEnter] = useState(true);
  const [animatedEmoji, setAnimatedEmoji] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Admin panel state
  const [adminMaintenanceMode, setAdminMaintenanceMode] = useState(false);
  const [adminRegistrationOpen, setAdminRegistrationOpen] = useState(true);
  const [adminMaxFileSize, setAdminMaxFileSize] = useState(100);
  const [adminBroadcastText, setAdminBroadcastText] = useState("");

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
    if (clean.length < 4) { setUsernameStatus("idle"); return; }
    if (clean === user?.username) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    setTimeout(() => {
      const taken = ["admin", "tepla", "support", "help"];
      setUsernameStatus(taken.includes(clean) ? "taken" : "available");
    }, 500);
  }

  function handleUsernameSave() {
    if (newUsername.length < 4 || usernameStatus === "taken") return;
    setUsername(newUsername);
    setUsernameStatus("saved");
    setTimeout(() => { setEditingUsername(false); setUsernameStatus("idle"); }, 1000);
  }

  if (!showSettings) return null;

  const sections = [
    { id: "general", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, label: "General" },
    { id: "notifications", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label: "Notifications" },
    { id: "privacy", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, label: "Privacy & Security" },
    { id: "language", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, label: "Language & Translation" },
    { id: "storage", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>, label: "Storage & Data" },
    { id: "devices", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, label: "Devices" },
    { id: "folders", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, label: "Chat Folders" },
    ...(user?.isAdmin ? [{ id: "admin", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: "Admin Panel" }] : []),
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
    { value: "everyone", label: "Everyone" },
    { value: "contacts", label: "Contacts" },
    { value: "nobody", label: "Nobody" },
  ];

  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in" onClick={toggleSettings}>
      <div className="absolute inset-0 bg-[var(--bg-overlay)]" />
      <div className="relative ml-auto flex h-full w-full max-w-md bg-[var(--bg-sidebar)] shadow-2xl animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-full w-full flex-col">
          <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
            <button onClick={toggleSettings} className="rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <h2 className="text-lg font-semibold">Settings</h2>
          </header>

          <div className="flex-1 overflow-y-auto">
            {/* Profile card */}
            <div className="flex items-center gap-4 border-b border-[var(--border)] p-4">
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleAvatarChange(e.target.files[0]); e.target.value = ""; }} />
              <button onClick={() => avatarInputRef.current?.click()} className="relative group shrink-0" disabled={avatarUploading}>
                <Avatar name={user?.name || "User"} size="lg" status="online" isPremium={user?.isPremium} src={user?.avatar} />
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
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
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
                      <button onClick={handleUsernameSave} className="text-emerald-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    )}
                    {usernameStatus === "taken" && <span className="text-[10px] text-red-400">taken</span>}
                    {usernameStatus === "saved" && <span className="text-[10px] text-emerald-400">saved!</span>}
                    <button onClick={() => { setEditingUsername(false); setUsernameStatus("idle"); }} className="text-[var(--text-tertiary)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
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
                      <SettingRow label="Font size">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setFontSize(Math.max(12, fontSize - 1))} className="rounded bg-[var(--bg-main)] px-2 py-0.5 text-xs hover:bg-[var(--bg-hover)]">-</button>
                          <span className="text-xs w-6 text-center">{fontSize}</span>
                          <button onClick={() => setFontSize(Math.min(20, fontSize + 1))} className="rounded bg-[var(--bg-main)] px-2 py-0.5 text-xs hover:bg-[var(--bg-hover)]">+</button>
                        </div>
                      </SettingRow>
                      <SettingRow label="Send by Enter"><Toggle on={sendByEnter} onChange={setSendByEnter} /></SettingRow>
                      <SettingRow label="Animated emoji"><Toggle on={animatedEmoji} onChange={setAnimatedEmoji} /></SettingRow>
                    </div>
                  )}

                  {/* Notifications */}
                  {activeSection === "notifications" && s.id === "notifications" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Private Chats</p>
                      <SettingRow label="Sound"><Toggle on={notifSound} onChange={setNotifSound} /></SettingRow>
                      <SettingRow label="Message preview"><Toggle on={notifPreview} onChange={setNotifPreview} /></SettingRow>
                      <SettingRow label="Push notifications"><Toggle on={notifPush} onChange={setNotifPush} /></SettingRow>
                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Groups & Channels</p>
                      <SettingRow label="Sound"><Toggle on={notifGroupSound} onChange={setNotifGroupSound} /></SettingRow>
                    </div>
                  )}

                  {/* Privacy & Security */}
                  {activeSection === "privacy" && s.id === "privacy" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Who can see</p>
                      <SettingRow label="Last seen"><RadioGroup value={privacyLastSeen} options={privacyOptions} onChange={setPrivacyLastSeen} /></SettingRow>
                      <SettingRow label="Phone number"><RadioGroup value={privacyPhone} options={privacyOptions} onChange={setPrivacyPhone} /></SettingRow>
                      <SettingRow label="Profile photo"><RadioGroup value={privacyPhoto} options={privacyOptions} onChange={setPrivacyPhoto} /></SettingRow>
                      <SettingRow label="Forwarded messages"><RadioGroup value={privacyForwards} options={privacyOptions} onChange={setPrivacyForwards} /></SettingRow>
                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Security</p>
                      <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors mb-1.5">
                        Two-Factor Authentication
                        <span className="block text-[10px] text-[var(--text-tertiary)]">Add an extra layer of security</span>
                      </button>
                      <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors mb-1.5">
                        Active Sessions
                        <span className="block text-[10px] text-[var(--text-tertiary)]">Manage logged-in devices</span>
                      </button>
                      <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                        Delete Account
                        <span className="block text-[10px] text-red-400/60">Permanently delete your account and data</span>
                      </button>
                    </div>
                  )}

                  {/* Language */}
                  {activeSection === "language" && s.id === "language" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-xs text-[var(--text-tertiary)]">Auto-translate messages to:</p>
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
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Auto-download</p>
                      <SettingRow label="Photos"><Toggle on={autoDownloadPhotos} onChange={setAutoDownloadPhotos} /></SettingRow>
                      <SettingRow label="Videos"><Toggle on={autoDownloadVideos} onChange={setAutoDownloadVideos} /></SettingRow>
                      <SettingRow label="Files"><Toggle on={autoDownloadFiles} onChange={setAutoDownloadFiles} /></SettingRow>
                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Storage usage</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Photos</span>
                          <span className="text-[var(--text-tertiary)]">12.4 MB</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Videos</span>
                          <span className="text-[var(--text-tertiary)]">0 B</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">Files</span>
                          <span className="text-[var(--text-tertiary)]">2.1 MB</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium pt-1 border-t border-[var(--border)]">
                          <span className="text-[var(--text-primary)]">Total</span>
                          <span className="text-[var(--text-primary)]">14.5 MB</span>
                        </div>
                      </div>
                      <button className="mt-3 w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-colors">
                        Clear Cache
                      </button>
                    </div>
                  )}

                  {/* Devices */}
                  {activeSection === "devices" && s.id === "devices" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Current device</p>
                      <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-main)] p-2.5 mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                        </div>
                        <div>
                          <p className="text-xs font-medium">This device</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Windows - Chrome</p>
                          <p className="text-[10px] text-emerald-400">Online now</p>
                        </div>
                      </div>
                      <button className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition-colors">
                        Terminate All Other Sessions
                      </button>
                    </div>
                  )}

                  {/* Admin Panel */}
                  {activeSection === "admin" && s.id === "admin" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider">Admin Controls</span>
                      </div>

                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Server</p>
                      <SettingRow label="Maintenance mode"><Toggle on={adminMaintenanceMode} onChange={setAdminMaintenanceMode} /></SettingRow>
                      <SettingRow label="Open registration"><Toggle on={adminRegistrationOpen} onChange={setAdminRegistrationOpen} /></SettingRow>
                      <SettingRow label="Max file size (MB)">
                        <div className="flex items-center gap-2">
                          <input type="number" value={adminMaxFileSize} onChange={(e) => setAdminMaxFileSize(Number(e.target.value))} className="w-16 rounded bg-[var(--bg-main)] px-2 py-0.5 text-xs text-center text-[var(--text-primary)] outline-none" />
                        </div>
                      </SettingRow>

                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Statistics</p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="rounded-lg bg-[var(--bg-main)] p-2.5 text-center">
                          <p className="text-lg font-bold text-[var(--accent)]">2</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Total Users</p>
                        </div>
                        <div className="rounded-lg bg-[var(--bg-main)] p-2.5 text-center">
                          <p className="text-lg font-bold text-emerald-400">1</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Online Now</p>
                        </div>
                        <div className="rounded-lg bg-[var(--bg-main)] p-2.5 text-center">
                          <p className="text-lg font-bold text-violet-400">2</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Total Chats</p>
                        </div>
                        <div className="rounded-lg bg-[var(--bg-main)] p-2.5 text-center">
                          <p className="text-lg font-bold text-amber-400">6</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Messages Today</p>
                        </div>
                      </div>

                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Broadcast</p>
                      <textarea value={adminBroadcastText} onChange={(e) => setAdminBroadcastText(e.target.value)} placeholder="Message to all users..." rows={2}
                        className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none resize-none mb-2" />
                      <button onClick={() => { if (adminBroadcastText.trim()) { alert("Broadcast sent: " + adminBroadcastText); setAdminBroadcastText(""); } }}
                        className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
                        Send Broadcast
                      </button>

                      <div className="my-2 border-t border-[var(--border)]" />
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Quick Actions</p>
                      <div className="space-y-1.5">
                        <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                          <span className="font-medium">Manage Users</span>
                          <span className="block text-[10px] text-[var(--text-tertiary)]">Ban, verify, promote users</span>
                        </button>
                        <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                          <span className="font-medium">Reported Content</span>
                          <span className="block text-[10px] text-[var(--text-tertiary)]">0 pending reports</span>
                        </button>
                        <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                          <span className="font-medium">Server Logs</span>
                          <span className="block text-[10px] text-[var(--text-tertiary)]">View activity and error logs</span>
                        </button>
                        <button className="w-full rounded-lg bg-[var(--bg-main)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                          <span className="font-medium">Feature Flags</span>
                          <span className="block text-[10px] text-[var(--text-tertiary)]">Toggle premium features, A/B tests</span>
                        </button>
                        <button className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/20 transition-colors">
                          <span className="font-medium">Clear All Cache</span>
                          <span className="block text-[10px] text-red-400/60">Flush Redis + CDN cache</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chat Folders */}
                  {activeSection === "folders" && s.id === "folders" && (
                    <div className="mb-2 ml-10 mr-3 rounded-xl bg-[var(--bg-input)] p-3 animate-slide-up">
                      <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Your folders</p>
                      {[
                        { name: "Work", icon: "\ud83d\udcbc", count: 0 },
                        { name: "Channels", icon: "\ud83d\udce2", count: 0 },
                        { name: "Bots", icon: "\ud83e\udd16", count: 0 },
                      ].map((f) => (
                        <div key={f.name} className="flex items-center justify-between rounded-lg bg-[var(--bg-main)] px-3 py-2.5 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span>{f.icon}</span>
                            <span className="text-xs font-medium">{f.name}</span>
                          </div>
                          <span className="text-[10px] text-[var(--text-tertiary)]">{f.count} chats</span>
                        </div>
                      ))}
                      <button className="mt-2 w-full rounded-lg border border-dashed border-[var(--border)] px-3 py-2.5 text-xs text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors">
                        + Create New Folder
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Account switcher */}
            {savedAccounts.length > 1 && (
              <div className="border-t border-[var(--border)] p-2">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-[var(--text-tertiary)] tracking-wider">Switch Account</p>
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
                <span className="text-sm">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
