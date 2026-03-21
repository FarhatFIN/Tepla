import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MessageType } from "@/types/message";

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const formatMessageTime = (isoString: string): string =>
  new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));

export const formatSidebarTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const sameDay = now.toDateString() === date.toDateString();

  if (sameDay) {
    return formatMessageTime(isoString);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
};

export const getMessagePreview = (
  content: string,
  type: MessageType,
  isDeleted = false,
): string => {
  if (isDeleted) {
    return "Message deleted";
  }

  if (type !== "text") {
    return `${type[0].toUpperCase()}${type.slice(1)} message`;
  }

  return content.replace(/\s+/g, " ").trim() || "Draft message";
};

