import useSWR from "swr";
import { fetcher } from "../lib/api";

export function useCustomers(page: number = 1, search: string = "", limit: number = 50) {
  const offset = (page - 1) * limit;
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
  
  const { data, error, mutate, isLoading } = useSWR(
    `/api/customers?limit=${limit}&offset=${offset}${searchParam}`,
    fetcher
  );

  return {
    data: data || { items: [], total: 0 },
    isLoading,
    isError: error,
    mutate,
  };
}
