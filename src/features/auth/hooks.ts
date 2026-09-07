import { useMutation } from "@tanstack/react-query";

import { queryClient } from "@/lib/query-client";

import { authApi } from "./api";
import { useSessionStore } from "./session-store";

export function useLogin() {
    return useMutation({ mutationFn: authApi.login });
}

export function useVerifyOtp() {
    const startSession = useSessionStore((s) => s.startSession);

    return useMutation({
        mutationFn: authApi.verifyOtp,
        onSuccess: ({ user, tokens }) => startSession(user, tokens),
    });
}

export function useLogout() {
    const clearSession = useSessionStore((s) => s.clearSession);

    return async () => {
        await clearSession();
        queryClient.clear();
    };
}
