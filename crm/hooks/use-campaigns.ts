import useSWR from "swr";
import { fetcher } from "../lib/api";

export function useCampaigns() {
  const { data, error, mutate, isLoading } = useSWR("/api/campaigns", fetcher);

  return {
    campaigns: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useCampaign(id: string, isLive: boolean = false) {
  const { data, error, mutate, isLoading } = useSWR(
    id ? `/api/campaigns/${id}` : null,
    fetcher,
    {
      // Poll every 2.5 seconds if the campaign is active/sending to show real-time funnel callback logs
      refreshInterval: isLive ? 2500 : 0,
      revalidateOnFocus: true,
    }
  );

  return {
    campaign: data,
    isLoading,
    isError: error,
    mutate,
  };
}
