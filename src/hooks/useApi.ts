"use client";

import { useQuery, UseQueryOptions, keepPreviousData } from "@tanstack/react-query";

export { keepPreviousData };

export const API_URL = "/api/custom";

export const queryKeyForPathAndQueryString = (pathAndQueryString: string): string[] => {
  try {
    const url = new URL(`https://0:0/${pathAndQueryString}`);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const searchParamPairs = [...url.searchParams]
      .filter(([, v]) => !!v)
      .map(([key, value]) => `${key}=${value}`);
    return ([] as string[]).concat(pathSegments, searchParamPairs);
  } catch (e) {
    console.error(e);
    return ["__INVALID_ENDPOINT_QUERY_KEY"];
  }
};

interface UseApiResult<T = unknown> {
  json: T | undefined;
  loading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

export const useApi = <T = unknown>(
  endpoint: string | null,
  options?: Partial<UseQueryOptions>,
): UseApiResult<T> => {
  const url = endpoint ? API_URL + endpoint : null;

  const { data, isPending, isFetching, refetch } = useQuery({
    ...options,
    queryKey: url ? queryKeyForPathAndQueryString(url) : ["__NO_ENDPOINT"],
    queryFn: async () => {
      if (!url) {
        return null;
      }
      const response = await window.fetch(url);
      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error("bad response");
        } else {
          return {
            status: response.status,
            ...(await response.json()),
          };
        }
      }
      return response.json();
    },
    enabled: !!url,
    retry: 3,
    retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 10_000),
    refetchOnWindowFocus: false,
  });

  return { json: data as T | undefined, loading: isPending, isFetching, refetch };
};

export const postApi = async <T = unknown>(
  endpoint: string,
  body: unknown,
): Promise<T> => {
  try {
    const response = await window.fetch(API_URL + endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
    });
    return { ...(await response.json()), status: response.status } as T;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export default useApi;
