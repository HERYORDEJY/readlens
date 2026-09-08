import { ActivityIndicator, StyleSheet, View } from "react-native";

import { TextField } from "@/components/text-field";
import { colors, spacing, typography } from "@/theme";

export function SearchBar({
    value,
    onChange,
    busy = false,
    disabled = false,
}: {
    value: string;
    onChange: (next: string) => void;
    busy?: boolean;
    disabled?: boolean;
}) {
    return (
        <View style={styles.searchRow}>
            <TextField
                accessibilityLabel="Search reports"
                value={value}
                onChangeText={onChange}
                placeholder="Search reports"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
                editable={!disabled}
                style={styles.searchInput}
            />
            {busy && (
                <ActivityIndicator
                    style={styles.searchSpinner}
                    color={colors.textMuted}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    searchRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    searchInput: { paddingRight: 36 },
    searchSpinner: {
        position: "absolute",
        right: spacing.xl + spacing.sm,
        bottom: spacing.xl + spacing.sm,
    },
});
