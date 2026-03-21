import useSWR from "swr";
import type { TeplaUser } from "@/types/user";

type UsersResponse = {
  users: TeplaUser[];
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to search users.");
  }

  return (await response.json()) as UsersResponse;
};

export const useUserSearch = (query: string) => {
  const trimmed = query.trim().replace(/^@+/, "");
  const swrKey =
    trimmed.length >= 2
      ? `/api/users/search?q=${encodeURIComponent(trimmed)}&limit=12`
      : null;

  const { data, error, isLoading } = useSWR<UsersResponse>(swrKey, fetcher);

  return {
    users: data?.users ?? [],
    isLoading,
    error,
  };
};
