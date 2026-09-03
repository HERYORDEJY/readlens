/** Uppercase is what the API expects; derived from the picked file, never typed by the user. */
export type ReportFileType = "JPEG" | "PNG" | "WEBP" | "PDF";

export interface ReportAuthor {
  name: string;
  email: string;
}

export interface ReportSummary {
  id: string;
  title: string;
  status: string;
  created_at: string;
  author: ReportAuthor;
}

export interface ReportDetail extends ReportSummary {
  description: string;
  /** Absent until the backend Lambda has processed an uploaded file. */
  file?: { url: string; type: string };
}

export interface Pagination {
  current_page: number;
  has_next: boolean;
  next_page: number | null;
  has_prev: boolean;
  prev_page: number | null;
  limit: number;
}

export interface ReportListData {
  reports: ReportSummary[];
  pagination: Pagination;
}

export interface ReportListParams {
  page: number;
  limit: number;
  search?: string;
}

export interface CreateReportRequest {
  title: string;
  description: string;
  file_type?: ReportFileType;
}

/** Presigned S3 POST details, returned only when `file_type` was supplied. */
export interface PresignedUpload {
  upload_url: string;
  fields: Record<string, string>;
  key: string;
}

export interface CreateReportData {
  id: string;
  file_url?: PresignedUpload;
}

export interface UploadFile {
  uri: string;
  name: string;
  mimeType: string;
}
