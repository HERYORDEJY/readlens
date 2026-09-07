import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

import { Button } from "./button";

interface StateMessageProps {
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function StateMessage({
    title,
    message,
    actionLabel,
    onAction,
}: StateMessageProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            {!!message && <Text style={styles.message}>{message}</Text>}
            {!!actionLabel && !!onAction && (
                <View style={styles.action}>
                    <Button
                        label={actionLabel}
                        onPress={onAction}
                        variant="secondary"
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xxl,
    },
    title: { ...typography.heading, color: colors.text, textAlign: "center" },
    message: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: "center",
        marginTop: spacing.sm,
    },
    action: { marginTop: spacing.lg, minWidth: 160 },
});
