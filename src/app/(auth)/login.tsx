import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { useLogin } from "@/features/auth/hooks";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { toErrorMessage } from "@/lib/error-message";
import { colors, spacing, typography } from "@/theme";

export default function LoginScreen() {
    const login = useLogin();
    const { control, handleSubmit, formState } = useForm<LoginFormValues>({
        resolver: yupResolver(loginSchema),
        defaultValues: { email: "", password: "" },
        mode: "onTouched",
    });

    const onSubmit = handleSubmit(({ email, password }) => {
        login.mutate(
            { email, password },
            {
                onSuccess: (data) =>
                    router.push({
                        pathname: "/verify-otp",
                        params: {
                            email: data.email ?? email,
                            token: data.token,
                        },
                    }),
            },
        );
    });

    return (
        <Screen>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>
                    Sign in and we&apos;ll email you a code to finish signing
                    in.
                </Text>

                <Controller
                    control={control}
                    name="email"
                    render={({ field, fieldState }) => (
                        <TextField
                            label="Email"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                            autoCapitalize="none"
                            autoComplete="email"
                            keyboardType="email-address"
                            placeholder="you@example.com"
                            editable={!login.isPending}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="password"
                    render={({ field, fieldState }) => (
                        <TextField
                            label="Password"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                            autoCapitalize="none"
                            autoComplete="current-password"
                            secureTextEntry
                            placeholder="Your password"
                            editable={!login.isPending}
                            onSubmitEditing={onSubmit}
                            returnKeyType="go"
                        />
                    )}
                />

                {login.isError && (
                    <Text accessibilityRole="alert" style={styles.formError}>
                        {toErrorMessage(login.error)}
                    </Text>
                )}

                <View style={styles.action}>
                    <Button
                        label="Continue"
                        onPress={onSubmit}
                        loading={login.isPending}
                        disabled={formState.isSubmitting}
                    />
                </View>

                {login.isPending && (
                    <Text style={styles.hint}>
                        The development server sleeps when idle — the first
                        request can take a moment.
                    </Text>
                )}
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
    formError: {
        ...typography.body,
        color: colors.danger,
        marginBottom: spacing.md,
    },
    action: { marginTop: spacing.sm },
    hint: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: "center",
        marginTop: spacing.md,
    },
});
