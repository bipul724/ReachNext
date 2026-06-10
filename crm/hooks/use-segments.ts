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

export function useSegmentPreview(id: string) {
  const { data, error, isLoading } = useSWR(
    id ? `/api/segments/${id}/preview` : null,
    fetcher
  );

  return {
    previewCustomers: data || [],
    isLoading,
    error,
  };
}
