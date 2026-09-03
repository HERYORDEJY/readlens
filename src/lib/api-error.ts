/**
 * Error taxonomy for the API layer.
 *
 * Screens need to tell three situations apart, and conflating them is the most
 * common way an auth implementation goes wrong:
 *
 *   NetworkError       the request never got an answer (timeout, connection
 *                      loss, the dev server waking up). NOT an auth failure —
 *                      logging the user out here is a bug.
 *   SessionExpiredError the session is unrecoverable and has been cleared.
 *   ApiError           the server answered with a definite, non-auth failure.
 */

/** `error_code` values observed on this API. Verified against the live server. */
export const API_ERROR_CODE = {
  /** "Session expired. Please login again." — the access token aged out. Refresh. */
  SESSION_EXPIRED: 1,
  /** "Unable to authenticate request." — credentials missing/invalid. Refresh cannot help. */
  UNAUTHENTICATED: 2,
} as const;

export class ApiError extends Error {
  readonly name = "ApiError";

  constructor(
    readonly status: number,
    readonly errorCode: number | null,
    message: string,
    readonly errors: string[] = [],
  ) {
    super(message);
  }
}

export class NetworkError extends Error {
  readonly name = "NetworkError";

  constructor(
    message: string,
    /** Axios code, e.g. ECONNABORTED for a timeout. */
    readonly code?: string,
  ) {
    super(message);
  }
}

export class SessionExpiredError extends Error {
  readonly name = "SessionExpiredError";

  constructor(message = "Your session has expired. Please log in again.") {
    super(message);
  }
}
