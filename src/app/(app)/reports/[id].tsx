import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { StateMessage } from "@/components/state-message";
import { formatReportDate } from "@/features/reports/format";
import { useReport } from "@/features/reports/hooks";
import { toErrorMessage } from "@/lib/error-message";
import { colors, radius, spacing, typography } from "@/theme";

const IMAGE_TYPES = ["jpeg", "jpg", "png", "webp"];

export default function ReportDetailScreen() {
    const { id, expectFile } = useLocalSearchParams<{
        id: string;
        expectFile?: string;
    }>();
    const {
        data: report,
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
    } = useReport(id, {
        expectFile: expectFile === "1",
    });

    const [opening, setOpening] = useState(false);
    const [openError, setOpenError] = useState<string | null>(null);

    const openAttachment = async (url: string) => {
        setOpenError(null);
        setOpening(true);
        try {
            await WebBrowser.openBrowserAsync(url);
        } catch (error) {
            setOpenError(toErrorMessage(error));
        } finally {
            setOpening(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (isError || !report) {
        return (
            <StateMessage
                title="We couldn't load this report"
                message={toErrorMessage(error)}
                actionLabel="Try again"
                onAction={() => void refetch()}
            />
        );
    }

    const fileUrl = report.file?.url;
    const fileType = report.file?.type?.toLowerCase() ?? "";
    const isImage = IMAGE_TYPES.includes(fileType);
    const fileLabel = fileType.toUpperCase() || "file";
    // The Lambda that attaches an uploaded file runs asynchronously, so a missing
    // file right after creation is an expected state, not an error.
    const awaitingFile = expectFile === "1" && !report.file?.url;

    return (
        <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>{report.title}</Text>

            <View style={styles.metaRow}>
                <Text style={styles.meta}>
                    {report.author?.name ||
                        report.author?.email ||
                        "Unknown author"}
                </Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.meta}>
                    {formatReportDate(report.created_at)}
                </Text>
            </View>

            {!!report.status && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{report.status}</Text>
                </View>
            )}

            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>
                {report.description || "No description provided."}
            </Text>

            <Text style={styles.sectionLabel}>Attachment</Text>
            {fileUrl ? (
                <View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${fileLabel} attachment`}
                        accessibilityHint="Opens the file in a browser"
                        onPress={() => void openAttachment(fileUrl)}
                        disabled={opening}
                        style={({ pressed }) => [
                            !isImage && styles.fileLink,
                            pressed && styles.fileLinkPressed,
                        ]}
                    >
                        {isImage ? (
                            <Image
                                source={{ uri: fileUrl }}
                                style={styles.image}
                                contentFit="cover"
                                transition={200}
                            />
                        ) : (
                            <Text style={styles.fileLinkText}>
                                {opening ? "Opening…" : `Open ${fileLabel}`}
                            </Text>
                        )}
                    </Pressable>

                    {isImage && (
                        <Text style={styles.imageHint}>
                            Tap to open the full-size file
                        </Text>
                    )}

                    {!!openError && (
                        <Text
                            accessibilityRole="alert"
                            style={styles.openError}
                        >
                            {openError}
                        </Text>
                    )}
                </View>
            ) : awaitingFile ? (
                <View style={styles.processing}>
                    <ActivityIndicator color={colors.textMuted} />
                    <Text style={styles.processingText}>
                        Processing your file. This usually takes a few seconds.
                    </Text>
                </View>
            ) : (
                <Text style={styles.noFile}>No file attached.</Text>
            )}

            {isFetching && <Text style={styles.refreshing}>Refreshing…</Text>}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { padding: spacing.xl, paddingBottom: spacing.xxl },
    title: { ...typography.title, color: colors.text },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: spacing.sm,
    },
    meta: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
    metaDot: {
        ...typography.caption,
        color: colors.textMuted,
        marginHorizontal: spacing.xs,
    },
    badge: {
        alignSelf: "flex-start",
        marginTop: spacing.md,
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
    sectionLabel: {
        ...typography.label,
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    description: { ...typography.body, color: colors.text, lineHeight: 22 },
    image: {
        width: "100%",
        aspectRatio: 4 / 3,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
    },
    fileLink: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
    },
    fileLinkPressed: { backgroundColor: colors.surface },
    fileLinkText: {
        ...typography.body,
        color: colors.primary,
        fontWeight: "600",
    },
    processing: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
    },
    processingText: { ...typography.body, color: colors.textMuted, flex: 1 },
    imageHint: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
    openError: {
        ...typography.caption,
        color: colors.danger,
        marginTop: spacing.sm,
    },
    noFile: { ...typography.body, color: colors.textMuted },
    refreshing: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: spacing.lg,
    },
});
