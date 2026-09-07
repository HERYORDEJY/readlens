import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

interface ButtonProps {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: "primary" | "secondary";
}

export function Button({
    label,
    onPress,
    loading = false,
    disabled = false,
    variant = "primary",
}: ButtonProps) {
    const inactive = disabled || loading;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: inactive, busy: loading }}
            disabled={inactive}
            onPress={onPress}
            style={({ pressed }) => [
                styles.base,
                variant === "secondary" && styles.secondary,
                pressed && !inactive && styles.pressed,
                inactive && styles.inactive,
            ]}
        >
            {loading ? (
                <ActivityIndicator
                    color={
                        variant === "secondary"
                            ? colors.primary
                            : colors.textInverse
                    }
                />
            ) : (
                <Text
                    style={[
                        styles.label,
                        variant === "secondary" && styles.secondaryLabel,
                    ]}
                >
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 50,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        backgroundColor: colors.primary,
    },
    secondary: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: colors.border,
    },
    pressed: { backgroundColor: colors.primaryPressed },
    inactive: { backgroundColor: colors.disabled },
    label: { ...typography.heading, color: colors.textInverse },
    secondaryLabel: { color: colors.primary },
});
