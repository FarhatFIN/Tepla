"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { useUserSearch } from "@/hooks/useUserSearch";
import type { TeplaUser } from "@/types/user";

type CreateGroupDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    username?: string | null;
    description?: string | null;
    memberIds: string[];
  }) => Promise<void>;
};

export const CreateGroupDialog = ({
  open,
  onClose,
  onCreate,
}: CreateGroupDialogProps) => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<TeplaUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { users, isLoading } = useUserSearch(query);

  const suggestedUsername = useMemo(
    () =>
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_ ]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 24),
    [name],
  );

  if (!open) {
    return null;
  }

  const toggleUser = (user: TeplaUser) => {
    setSelectedUsers((current) => {
      const exists = current.some((item) => item.id === user.id);
      return exists
        ? current.filter((item) => item.id !== user.id)
        : [...current, user];
    });
  };

  const resetAndClose = () => {
    setName("");
    setUsername("");
    setDescription("");
    setQuery("");
    setSelectedUsers([]);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreate({
        name: name.trim(),
        username: username.trim() || suggestedUsername || null,
        description: description.trim() || null,
        memberIds: selectedUsers.map((user) => user.id),
      });
      resetAndClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to create group.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-xl border-white/10 bg-[linear-gradient(180deg,rgba(2,8,24,0.96),rgba(3,10,32,0.92))]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
              New group
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Create a Tepla group</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={resetAndClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-tepla-text-muted">Group name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-tepla-text-muted">Public username</label>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={suggestedUsername || "team_room"}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-tepla-text-muted">Description</label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this group for?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-tepla-text-muted">Add members by username</label>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="@username"
              leftIcon={<Search className="h-4 w-4" />}
            />

            <div className="max-h-56 space-y-2 overflow-auto rounded-2xl border border-white/10 bg-white/[0.03] p-2">
              {isLoading ? (
                <div className="flex items-center gap-2 px-2 py-3 text-sm text-tepla-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching users...
                </div>
              ) : users.length > 0 ? (
                users.map((user) => {
                  const selected = selectedUsers.some((item) => item.id === user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition-colors ${
                        selected ? "bg-sky-500/10" : "hover:bg-white/5"
                      }`}
                      onClick={() => toggleUser(user)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          size="sm"
                          alt={user.displayName ?? user.username}
                          src={user.avatarUrl ?? undefined}
                        />
                        <div>
                          <p className="text-sm text-white">
                            {user.displayName ?? user.username}
                          </p>
                          <p className="text-xs text-tepla-text-muted">@{user.username}</p>
                        </div>
                      </div>
                      {selected ? (
                        <span className="text-xs font-medium text-sky-300">Added</span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-2 py-3 text-sm text-tepla-text-muted">
                  Search for teammates to add them to the group.
                </div>
              )}
            </div>
          </div>

          {selectedUsers.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center gap-2 text-sm text-white">
                <Users className="h-4 w-4 text-sky-300" />
                Selected members
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white"
                  >
                    @{user.username}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-xs text-tepla-danger">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create group
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
