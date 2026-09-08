import { forwardRef } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    View,
    type TextInputProps,
} from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

interface TextFieldProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
    function TextField({ label, error, style, ...props }, ref) {
        return (
            <View style={styles.container}>
                {Boolean(label?.trim()) ? (
                    <Text style={styles.label}>{label}</Text>
                ) : null}
                <TextInput
                    ref={ref}
                    accessibilityLabel={label}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, !!error && styles.inputError, style]}
                    {...props}
                />
                {!!error && (
                    <Text accessibilityRole="alert" style={styles.error}>
                        {error}
                    </Text>
                )}
            </View>
        );
    },
);

const styles = StyleSheet.create({
    container: { marginBottom: spacing.lg },
    label: {
        ...typography.label,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    input: {
        ...typography.body,
        minHeight: 50,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        color: colors.text,
    },
    inputError: { borderColor: colors.danger },
    error: {
        ...typography.caption,
        color: colors.danger,
        marginTop: spacing.xs,
    },
});
