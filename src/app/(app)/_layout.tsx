import { Stack } from "expo-router";

import { colors } from "@/theme";

export default function AppLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.primary,
                headerTitleStyle: { color: colors.text },
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen name="index" options={{ title: "Reports" }} />
            <Stack.Screen name="reports/[id]" options={{ title: "Report" }} />
            <Stack.Screen
                name="reports/create"
                options={{ title: "New report", presentation: "modal" }}
            />
        </Stack>
    );
}
