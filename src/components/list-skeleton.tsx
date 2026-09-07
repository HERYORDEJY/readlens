import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/theme";

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <View accessibilityLabel="Loading reports">
            {Array.from({ length: rows }, (_, index) => (
                <View key={index} style={styles.row}>
                    <View style={[styles.bar, styles.title]} />
                    <View style={[styles.bar, styles.meta]} />
                    <View style={[styles.bar, styles.badge]} />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    bar: { backgroundColor: colors.surface, borderRadius: radius.sm },
    title: { height: 18, width: "72%" },
    meta: { height: 12, width: "46%", marginTop: spacing.sm },
    badge: {
        height: 16,
        width: 64,
        marginTop: spacing.sm,
        borderRadius: radius.pill,
    },
});
