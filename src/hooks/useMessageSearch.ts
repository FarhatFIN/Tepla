import { useMemo } from "react";
import useSWR from "swr";
import type { TeplaMessage } from "@/types/message";

type SearchResult = {
  messages: Array<TeplaMessage & { highlight?: string }>;
  total: number;
};

const fetcher = async (url: string): Promise<SearchResult> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Search failed.");
  }
  const data = await response.json();

  // Normalize response from Elasticsearch search API
  if (data.hits) {
    return {
      messages: data.hits.map((hit: { _source: TeplaMessage; highlight?: Record<string, string[]> }) => ({
        ...hit._source,
        highlight: hit.highlight?.content?.[0] ?? undefined,
      })),
      total: data.total ?? data.hits.length,
    };
  }

  // Fallback: direct message array
  return {
    messages: data.messages ?? [],
    total: data.total ?? data.messages?.length ?? 0,
  };
};

/**
 * Search messages via the Elasticsearch backend.
 * Falls back gracefully if the search service is unavailable.
 */
export const useMessageSearch = (params: {
  query: string;
  chatId: string | null;
  type?: string;
  enabled?: boolean;
}) => {
  const { query, chatId, type, enabled = true } = params;
  const trimmed = query.trim();

  const swrKey = useMemo(() => {
    if (!enabled || !chatId || trimmed.length < 2) return null;

    const searchParams = new URLSearchParams({
      q: trimmed,
      chatId,
      limit: "50",
    });

    if (type && type !== "text") {
      searchParams.set("type", type);
    }

    return `/api/search/messages?${searchParams.toString()}`;
  }, [enabled, chatId, trimmed, type]);

  const { data, error, isLoading } = useSWR<SearchResult>(swrKey, fetcher, {
    dedupingInterval: 500,
    revalidateOnFocus: false,
  });

  return {
    results: data?.messages ?? [],
    total: data?.total ?? 0,
    isSearching: isLoading,
    searchError: error,
    isServerSearch: Boolean(swrKey),
  };
};
