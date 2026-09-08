import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import type { ReportFileType, UploadFile } from "./types";

/** A soft cap. A clear message beats an opaque S3 rejection on a large file. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class FilePickerError extends Error {
  readonly name = "FilePickerError";
}

const MIME_TO_FILE_TYPE: Record<string, ReportFileType> = {
  "image/jpeg": "JPEG",
  "image/jpg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WEBP",
  "application/pdf": "PDF",
};

const EXTENSION_TO_FILE_TYPE: Record<string, ReportFileType> = {
  jpg: "JPEG",
  jpeg: "JPEG",
  png: "PNG",
  webp: "WEBP",
  pdf: "PDF",
};

/**
 * The API wants an uppercase file_type. Derive it from what the picker reports
 * rather than asking the user to classify their own file.
 */
export function resolveFileType(mimeType?: string | null, name?: string | null): ReportFileType | null {
  const byMime = mimeType ? MIME_TO_FILE_TYPE[mimeType.toLowerCase()] : undefined;
  if (byMime) return byMime;

  const extension = name?.split(".").pop()?.toLowerCase();
  if (!extension) return null;
  return EXTENSION_TO_FILE_TYPE[extension] ?? null;
}

export interface PickedFile extends UploadFile {
  fileType: ReportFileType;
  sizeBytes: number | null;
}

function validate(
  uri: string,
  name: string,
  mimeType: string | null,
  sizeBytes: number | null,
): PickedFile {
  const fileType = resolveFileType(mimeType, name);
  if (!fileType) {
    throw new FilePickerError("That file type isn't supported. Choose a JPEG, PNG, WEBP, or PDF.");
  }
  if (sizeBytes !== null && sizeBytes > MAX_FILE_BYTES) {
    throw new FilePickerError(
      `That file is ${(sizeBytes / 1024 / 1024).toFixed(1)}MB. Please choose one under ${MAX_FILE_BYTES / 1024 / 1024}MB.`,
    );
  }
  return { uri, name, mimeType: mimeType ?? "application/octet-stream", fileType, sizeBytes };
}

export async function pickImage(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new FilePickerError(
      "Photo access is needed to attach an image. You can enable it in Settings.",
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  // fileName can be null when the user grants only limited library access.
  const name = asset.fileName ?? `image-${Date.now()}.jpg`;
  return validate(asset.uri, name, asset.mimeType ?? null, asset.fileSize ?? null);
}

export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    // Required: the original URI may not be readable when we upload it later.
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  return validate(asset.uri, asset.name, asset.mimeType ?? null, asset.size ?? null);
}
