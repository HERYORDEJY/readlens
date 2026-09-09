import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { useSessionStore } from "@/features/auth/session-store";
import { queryClient } from "@/lib/query-client";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const status = useSessionStore((s) => s.status);
    const hydrate = useSessionStore((s) => s.hydrate);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (status !== "hydrating") void SplashScreen.hideAsync();
    }, [status]);

    if (status === "hydrating") return null;

    return (
        <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Protected guard={status === "authenticated"}>
                    <Stack.Screen name="(app)" />
                </Stack.Protected>
                <Stack.Protected guard={status === "unauthenticated"}>
                    <Stack.Screen name="(auth)" />
                </Stack.Protected>
            </Stack>
            </QueryClientProvider>
        </SafeAreaProvider>
    );
}
