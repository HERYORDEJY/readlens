import { QueryClient } from "@tanstack/react-query";

import { NetworkError, SessionExpiredError } from "./api-error";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
                if (error instanceof SessionExpiredError) return false;
                // Transient trouble — worth retrying while the dev server wakes up.
                return error instanceof NetworkError && failureCount < 2;
            },
        },
        mutations: {
            retry: false, // Never automatic: retrying report creation would create duplicates.
        },
    },
});
