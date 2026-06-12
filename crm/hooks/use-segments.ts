import useSWR from "swr";
import { fetcher } from "../lib/api";

export function useSegments() {
  const { data, error, mutate, isLoading } = useSWR("/api/segments", fetcher);

  return {
    segments: data || [],
    isLoading,
    error,
    mutate,
  };
}
