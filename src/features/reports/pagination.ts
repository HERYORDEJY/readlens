import type { ReportListData } from "./types";

/**
 * Stops paging when the API says there is no next page. Exported so the
 * boundary condition is testable without standing up a query client.
 */
export function nextPageParam(last: ReportListData): number | undefined {
    if (!last.pagination.has_next) return undefined;
    return last.pagination.next_page ?? undefined;
}
