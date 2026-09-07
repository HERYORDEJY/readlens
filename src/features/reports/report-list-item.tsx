import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

import { formatReportDate } from "./format";
import type { ReportSummary } from "./types";

interface ReportListItemProps {
    report: ReportSummary;
    onPress: (id: string) => void;
}

export const ReportListItem = memo(function ReportListItem({
    report,
    onPress,
}: ReportListItemProps) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={() => onPress(report.id)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
            <Text style={styles.title} numberOfLines={2}>
                {report.title}
            </Text>
            <View style={styles.meta}>
                <Text style={styles.metaText} numberOfLines={1}>
                    {report.author?.name ||
                        report.author?.email ||
                        "Unknown author"}
                </Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>
                    {formatReportDate(report.created_at)}
                </Text>
            </View>
            {!!report.status && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{report.status}</Text>
                </View>
            )}
        </Pressable>
    );
});

const styles = StyleSheet.create({
    row: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    pressed: { backgroundColor: colors.surface },
    title: { ...typography.heading, color: colors.text },
    meta: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
    metaText: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
    metaDot: {
        ...typography.caption,
        color: colors.textMuted,
        marginHorizontal: spacing.xs,
    },
    badge: {
        alignSelf: "flex-start",
        marginTop: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    badgeText: {
        ...typography.caption,
        color: colors.textMuted,
        textTransform: "capitalize",
    },
});
