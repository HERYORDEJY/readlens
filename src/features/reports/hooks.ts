import {
    keepPreviousData,
    useInfiniteQuery,
    useQuery,
} from "@tanstack/react-query";

import { reportsApi } from "./api";
import { nextPageParam } from "./pagination";
import type { ReportDetail, ReportListData } from "./types";

export const PAGE_SIZE = 10;

export const reportKeys = {
    all: ["reports"] as const,
    list: (search: string) => ["reports", "list", search] as const,
    detail: (id: string) => ["reports", "detail", id] as const,
};

export function useReportsInfinite(search: string) {
    return useInfiniteQuery({
        queryKey: reportKeys.list(search),
        queryFn: ({ pageParam }) =>
            reportsApi.list({
                page: pageParam,
                limit: PAGE_SIZE,
                search: search || undefined,
            }),
        initialPageParam: 1,
        getNextPageParam: nextPageParam,
        placeholderData: keepPreviousData,
    });
}

/** Attempts before giving up on a file the Lambda has not attached yet. */
const MAX_FILE_POLLS = 6;
const FILE_POLL_INTERVAL_MS = 5_000;

/**
 * A freshly uploaded file takes a moment to appear while the backend Lambda
 * processes it. Poll briefly, but cap it — an uncapped poll against a server
 * that sleeps is worse than showing a stale placeholder.
 */
export function useReport(
    id: string,
    { expectFile = false }: { expectFile?: boolean } = {},
) {
    return useQuery({
        queryKey: reportKeys.detail(id),
        queryFn: () => reportsApi.detail(id),
        refetchOnWindowFocus: true,
        refetchInterval: (query) => {
            if (!expectFile) return false;
            const report = query.state.data as ReportDetail | undefined;
            if (report?.file?.url) return false;
            return query.state.dataUpdateCount <= MAX_FILE_POLLS
                ? FILE_POLL_INTERVAL_MS
                : false;
        },
    });
}
