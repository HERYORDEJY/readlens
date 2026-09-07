import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

interface ScreenProps {
    children: ReactNode;
    padded?: boolean;
}

export function Screen({ children, padded = true }: ScreenProps) {
    return (
        <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={[styles.flex, padded && styles.padded]}>
                    {children}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    padded: { paddingHorizontal: spacing.xl },
});
