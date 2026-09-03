import { httpClient } from "@/lib/api";
import type { AuthTokens } from "@/lib/http-client";
import { parseSetCookie, unsignCookieValue } from "@/lib/set-cookie";

import type { LoginData, LoginRequest, User, VerifyOtpData, VerifyOtpRequest } from "./types";

export interface VerifiedSession {
  user: User;
  tokens: AuthTokens;
}

export const authApi = {
  /** Step 1: exchange credentials for a short-lived token; an OTP is emailed. */
  login: (body: LoginRequest): Promise<LoginData> =>
    httpClient.request<LoginData>({ method: "POST", url: "/auth/login", data: body }),

  /**
   * Step 2: exchange the OTP for a session.
   *
   * The body carries only `access_token`; `refresh_token` and `session_key`
   * come back as HttpOnly Set-Cookie headers. They are lifted out here so they
   * can be held in the Keychain and re-sent as explicit headers, instead of
   * living in React Native's cookie jar where storage is plaintext and clearing
   * on logout is unreliable.
   */
  verifyOtp: async (body: VerifyOtpRequest): Promise<VerifiedSession> => {
    const response = await httpClient.requestRaw<VerifyOtpData>({
      method: "POST",
      url: "/auth/login/verify_otp",
      data: body,
    });

    const cookies = parseSetCookie(response.headers["set-cookie"]);
    const refreshToken = cookies.refresh_token && unsignCookieValue(cookies.refresh_token);
    const sessionKey = cookies.session_key && unsignCookieValue(cookies.session_key);

    if (!refreshToken || !sessionKey) {
      // Neither is recoverable by any other call, so failing here beats a
      // half-built session that dies at the first token expiry.
      throw new Error(
        "Login succeeded but the server did not return session credentials. Please try again.",
      );
    }

    return {
      user: response.data.data.user,
      tokens: { accessToken: response.data.data.access_token, refreshToken, sessionKey },
    };
  },
};
