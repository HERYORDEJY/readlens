import { yupResolver } from "@hookform/resolvers/yup";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { useVerifyOtp } from "@/features/auth/hooks";
import { otpSchema, type OtpFormValues } from "@/features/auth/schemas";
import { toErrorMessage } from "@/lib/error-message";
import { colors, spacing, typography } from "@/theme";

export default function VerifyOtpScreen() {
    const { email, token } = useLocalSearchParams<{
        email: string;
        token: string;
    }>();
    const verify = useVerifyOtp();

    const { control, handleSubmit } = useForm<OtpFormValues>({
        resolver: yupResolver(otpSchema),
        defaultValues: { otp: "" },
        mode: "onTouched",
    });

    const onSubmit = handleSubmit(({ otp }) =>
        verify.mutate({ otp, email, token }),
    );

    return (
        <Screen>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.subtitle}>
                    We sent a sign-in code to{" "}
                    <Text style={styles.email}>{email}</Text>.
                </Text>

                <Controller
                    control={control}
                    name="otp"
                    render={({ field, fieldState }) => (
                        <TextField
                            label="Sign-in code"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                            autoFocus
                            keyboardType="number-pad"
                            textContentType="oneTimeCode"
                            autoComplete="off"
                            maxLength={8}
                            placeholder="123456"
                            style={styles.otpInput}
                            editable={!verify.isPending}
                            onSubmitEditing={onSubmit}
                            returnKeyType="go"
                        />
                    )}
                />

                {verify.isError && (
                    <Text accessibilityRole="alert" style={styles.formError}>
                        {toErrorMessage(verify.error)}
                    </Text>
                )}

                <View style={styles.action}>
                    <Button
                        label="Verify and continue"
                        onPress={onSubmit}
                        loading={verify.isPending}
                    />
                </View>

                <Pressable
                    accessibilityRole="button"
                    onPress={() => router.back()}
                    disabled={verify.isPending}
                    style={styles.back}
                >
                    <Text style={styles.backLabel}>Use a different email</Text>
                </Pressable>

                {/* The API exposes no resend endpoint, so the UI does not offer one. */}
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        justifyContent: "center",
        paddingVertical: spacing.xxl,
    },
    title: { ...typography.title, color: colors.text },
    subtitle: {
        ...typography.body,
        color: colors.textMuted,
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
    email: { color: colors.text, fontWeight: "600" },
    otpInput: { fontSize: 22, letterSpacing: 6, textAlign: "center" },
    formError: {
        ...typography.body,
        color: colors.danger,
        marginBottom: spacing.md,
    },
    action: { marginTop: spacing.sm },
    back: { alignSelf: "center", marginTop: spacing.lg, padding: spacing.sm },
    backLabel: { ...typography.body, color: colors.primary },
});
