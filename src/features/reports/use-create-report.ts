import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reportsApi } from "./api";
import type { PickedFile } from "./file-picker";
import { reportKeys } from "./hooks";
import type { PresignedUpload, UploadFile } from "./types";

export interface PendingUpload {
  /** The report already exists. Re-running creation would duplicate it. */
  reportId: string;
  /** Held so the upload alone can be retried, subject to the presign expiry. */
  upload: PresignedUpload;
  file: UploadFile;
}

/**
 * Raised when the report was created but its file never reached S3.
 *
 * This is deliberately its own error: reporting total failure would tempt the
 * user into resubmitting and creating a duplicate, while swallowing it would
 * leave a report silently missing its attachment.
 */
export class FileUploadError extends Error {
  readonly name = "FileUploadError";

  constructor(
    readonly pending: PendingUpload,
    override readonly cause: unknown,
  ) {
    super("Your report was created, but the file couldn't be attached.");
  }
}

export interface CreateReportInput {
  title: string;
  description: string;
  file: PickedFile | null;
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description, file }: CreateReportInput) => {
      const created = await reportsApi.create({
        title,
        description,
        ...(file ? { file_type: file.fileType } : {}),
      });

      if (file && created.file_url) {
        try {
          await reportsApi.uploadFile(created.file_url, file);
        } catch (error) {
          throw new FileUploadError(
            { reportId: created.id, upload: created.file_url, file },
            error,
          );
        }
      }

      return { reportId: created.id, hasFile: Boolean(file) };
    },
    // Runs on failure too: a FileUploadError still means a new report exists.
    onSettled: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

/** Retries only the S3 upload, reusing the presigned fields already in hand. */
export function useRetryUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pending: PendingUpload) => reportsApi.uploadFile(pending.upload, pending.file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}
