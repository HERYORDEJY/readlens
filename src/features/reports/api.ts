import axios from "axios";

import { httpClient } from "@/lib/api";
import { NetworkError } from "@/lib/api-error";

import type {
  CreateReportData,
  CreateReportRequest,
  PresignedUpload,
  ReportDetail,
  ReportListData,
  ReportListParams,
  UploadFile,
} from "./types";

export const reportsApi = {
  list: ({ page, limit, search }: ReportListParams): Promise<ReportListData> =>
    httpClient.request<ReportListData>({
      method: "GET",
      url: "/reports/test",
      // Server-side paging and search: the client never filters locally.
      params: { page, limit, ...(search ? { search } : {}) },
    }),

  detail: (id: string): Promise<ReportDetail> =>
    httpClient.request<ReportDetail>({ method: "GET", url: `/reports/test/${id}` }),

  create: (body: CreateReportRequest): Promise<CreateReportData> =>
    httpClient.request<CreateReportData>({ method: "POST", url: "/reports/test", data: body }),

  /**
   * Upload straight to S3 with the presigned POST fields.
   *
   * Deliberately a bare axios call: this leaves our API's host, so sending its
   * Basic Auth header would both leak the credential to a third party and break
   * the presigned signature.
   */
  uploadFile: async (upload: PresignedUpload, file: UploadFile): Promise<void> => {
    const form = new FormData();

    // Order matters. S3 ignores any field that follows `file`, so every
    // policy field must be appended before it or the upload 403s.
    for (const [key, value] of Object.entries(upload.fields)) {
      form.append(key, value);
    }
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob);

    try {
      // Content-Type is left unset so the runtime supplies the multipart boundary.
      await axios.post(upload.upload_url, form, { timeout: 120_000 });
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        throw new NetworkError(error.message, error.code);
      }
      throw error;
    }
  },
};
