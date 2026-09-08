import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { FilePickerError, pickDocument, pickImage, type PickedFile } from "@/features/reports/file-picker";
import { createReportSchema, type CreateReportFormValues } from "@/features/reports/schemas";
import {
  FileUploadError,
  useCreateReport,
  useRetryUpload,
  type PendingUpload,
} from "@/features/reports/use-create-report";
import { toErrorMessage } from "@/lib/error-message";
import { colors, radius, spacing, typography } from "@/theme";

export default function CreateReportScreen() {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  // Set only when the report exists but its upload failed. While it is set the
  // form is hidden, so the user cannot resubmit and create a duplicate.
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const createReport = useCreateReport();
  const retryUpload = useRetryUpload();

  const { control, handleSubmit } = useForm<CreateReportFormValues>({
    resolver: yupResolver(createReportSchema),
    defaultValues: { title: "", description: "" },
    mode: "onTouched",
  });

  const openDetail = (reportId: string, expectFile: boolean) =>
    router.replace({
      pathname: "/reports/[id]",
      params: expectFile ? { id: reportId, expectFile: "1" } : { id: reportId },
    });

  const choose = async (picker: () => Promise<PickedFile | null>) => {
    setPickerError(null);
    try {
      const picked = await picker();
      if (picked) setFile(picked);
    } catch (error) {
      setPickerError(
        error instanceof FilePickerError ? error.message : toErrorMessage(error),
      );
    }
  };

  const onSubmit = handleSubmit(({ title, description }) => {
    createReport.mutate(
      { title, description, file },
      {
        onSuccess: ({ reportId, hasFile }) => openDetail(reportId, hasFile),
        onError: (error) => {
          if (error instanceof FileUploadError) setPendingUpload(error.pending);
        },
      },
    );
  });

  if (pendingUpload) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Report created</Text>
          <Text style={styles.subtitle}>
            Your report was saved, but <Text style={styles.strong}>{pendingUpload.file.name}</Text>{" "}
            didn&apos;t finish uploading. You can retry the upload — the report itself is already
            safe, so nothing will be duplicated.
          </Text>

          {retryUpload.isError && (
            <Text accessibilityRole="alert" style={styles.formError}>
              {toErrorMessage(retryUpload.error)} The upload link may have expired.
            </Text>
          )}

          <View style={styles.action}>
            <Button
              label="Retry upload"
              loading={retryUpload.isPending}
              onPress={() =>
                retryUpload.mutate(pendingUpload, {
                  onSuccess: () => openDetail(pendingUpload.reportId, true),
                })
              }
            />
          </View>
          <View style={styles.action}>
            <Button
              label="Continue without the file"
              variant="secondary"
              disabled={retryUpload.isPending}
              onPress={() => openDetail(pendingUpload.reportId, false)}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <TextField
              label="Title"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="What is this report about?"
              editable={!createReport.isPending}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <TextField
              label="Description"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Add the detail someone would need to act on this"
              multiline
              numberOfLines={5}
              style={styles.multiline}
              editable={!createReport.isPending}
            />
          )}
        />

        <Text style={styles.sectionLabel}>Supporting file (optional)</Text>
        {file ? (
          <View style={styles.fileRow}>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileMeta}>
                {file.fileType}
                {file.sizeBytes ? ` · ${(file.sizeBytes / 1024 / 1024).toFixed(1)}MB` : ""}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFile(null)}
              disabled={createReport.isPending}
              hitSlop={8}
            >
              <Text style={styles.removeLabel}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.pickerRow}>
            <View style={styles.pickerButton}>
              <Button
                label="Choose image"
                variant="secondary"
                disabled={createReport.isPending}
                onPress={() => void choose(pickImage)}
              />
            </View>
            <View style={styles.pickerButton}>
              <Button
                label="Choose PDF"
                variant="secondary"
                disabled={createReport.isPending}
                onPress={() => void choose(pickDocument)}
              />
            </View>
          </View>
        )}

        {!!pickerError && (
          <Text accessibilityRole="alert" style={styles.formError}>
            {pickerError}
          </Text>
        )}

        {createReport.isError && !(createReport.error instanceof FileUploadError) && (
          <Text accessibilityRole="alert" style={styles.formError}>
            {toErrorMessage(createReport.error)}
          </Text>
        )}

        <View style={styles.action}>
          <Button label="Create report" onPress={onSubmit} loading={createReport.isPending} />
        </View>

        {createReport.isPending && !!file && (
          <Text style={styles.hint}>Uploading {file.name}…</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: spacing.xl },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 22 },
  strong: { color: colors.text, fontWeight: "600" },
  multiline: { minHeight: 120, paddingTop: spacing.md, textAlignVertical: "top" },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  pickerRow: { flexDirection: "row", gap: spacing.md },
  pickerButton: { flex: 1 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileInfo: { flex: 1 },
  fileName: { ...typography.body, color: colors.text },
  fileMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  removeLabel: { ...typography.body, color: colors.danger },
  formError: { ...typography.body, color: colors.danger, marginTop: spacing.md },
  action: { marginTop: spacing.lg },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
});
