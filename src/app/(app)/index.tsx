import { router, useNavigation } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListSkeleton } from "@/components/list-skeleton";
import { StateMessage } from "@/components/state-message";
import { useLogout } from "@/features/auth/hooks";
import { useReportsInfinite } from "@/features/reports/hooks";
import { ReportListItem } from "@/features/reports/report-list-item";
import type { ReportSummary } from "@/features/reports/types";
import { toErrorMessage } from "@/lib/error-message";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { colors, spacing, typography } from "@/theme";
import { SearchBar } from "@/components/search-bar";

const FAB_CLEARANCE = 96;

export default function ReportsListScreen() {
    const navigation = useNavigation();
    const logout = useLogout();
    const insets = useSafeAreaInsets();

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search.trim());

    const query = useReportsInfinite(debouncedSearch);
    const {
        data,
        error,
        isLoading,
        isError,
        isFetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        refetch,
    } = query;

    const reports = useMemo(
        () => data?.pages.flatMap((page) => page.reports) ?? [],
        [data],
    );

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => void logout()}
                    hitSlop={8}
                >
                    <Text style={styles.headerAction}>Log out</Text>
                </Pressable>
            ),
        });
    }, [navigation, logout]);

    const openReport = useCallback(
        (id: string) =>
            router.push({ pathname: "/reports/[id]", params: { id } }),
        [],
    );

    const loadNextPage = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const renderItem = useCallback(
        ({ item }: { item: ReportSummary }) => (
            <ReportListItem report={item} onPress={openReport} />
        ),
        [openReport],
    );

    if (isLoading) {
        return (
            <View style={styles.container}>
                <SearchBar value={search} onChange={setSearch} disabled />
                <ListSkeleton />
            </View>
        );
    }

    if (isError && reports.length === 0) {
        return (
            <View style={styles.container}>
                <SearchBar value={search} onChange={setSearch} />
                <StateMessage
                    title="We couldn't load your reports"
                    message={toErrorMessage(error)}
                    actionLabel="Try again"
                    onAction={() => void refetch()}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SearchBar
                value={search}
                onChange={setSearch}
                busy={isFetching && !isFetchingNextPage && reports.length > 0}
            />

            <FlatList
                data={reports}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={[
                    reports.length === 0 && styles.emptyContent,
                    { paddingBottom: FAB_CLEARANCE + insets.bottom },
                ]}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                onEndReached={loadNextPage}
                onEndReachedThreshold={0.4}
                refreshControl={
                    <RefreshControl
                        refreshing={
                            isFetching &&
                            !isFetchingNextPage &&
                            reports.length > 0
                        }
                        onRefresh={() => void refetch()}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    debouncedSearch ? (
                        <StateMessage
                            title="No matching reports"
                            message={`Nothing matched "${debouncedSearch}". Try a different search.`}
                            actionLabel="Clear search"
                            onAction={() => setSearch("")}
                        />
                    ) : (
                        <StateMessage
                            title="No reports yet"
                            message="Create your first report and it will show up here."
                            actionLabel="Create a report"
                            onAction={() => router.push("/reports/create")}
                        />
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <View style={styles.footer}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : isError && reports.length > 0 ? (
                        <Pressable
                            style={styles.footerError}
                            onPress={() => void fetchNextPage()}
                        >
                            <Text style={styles.footerErrorText}>
                                Couldn&apos;t load more. Tap to retry.
                            </Text>
                        </Pressable>
                    ) : null
                }
            />

            <Pressable
                accessibilityLabel="Create a report"
                accessibilityRole="button"
                onPress={() => router.push("/reports/create")}
                style={({ pressed }) => [
                    styles.fab,
                    { bottom: spacing.xl + insets.bottom },
                    pressed && styles.fabPressed,
                ]}
            >
                <Text style={styles.fabLabel}>New report</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    emptyContent: { flexGrow: 1 },
    footer: { paddingVertical: spacing.xl, alignItems: "center" },
    footerError: { paddingVertical: spacing.lg, alignItems: "center" },
    footerErrorText: { ...typography.body, color: colors.danger },
    headerAction: { ...typography.body, color: colors.primary },
    fab: {
        position: "absolute",
        right: spacing.lg,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 999,
        backgroundColor: colors.primary,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    fabPressed: { backgroundColor: colors.primaryPressed },
    fabLabel: { ...typography.label, color: colors.textInverse },
});
