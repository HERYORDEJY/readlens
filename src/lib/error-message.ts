import { ApiError, NetworkError, SessionExpiredError } from "./api-error";

export function toErrorMessage(error: unknown): string {
    if (error instanceof NetworkError) {
        return error.code === "ECONNABORTED"
            ? "That took longer than expected. The server may be waking up — please try again."
            : "We couldn't reach the server. Check your connection and try again.";
    }
    if (error instanceof SessionExpiredError) return error.message;
    if (error instanceof ApiError) return error.errors[0] ?? error.message;
    if (error instanceof Error && error.message) return error.message;
    return "Something went wrong. Please try again.";
}
