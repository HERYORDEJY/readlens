import axios, {
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosResponse,
} from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

import {
    API_ERROR_CODE,
    ApiError,
    NetworkError,
    SessionExpiredError,
} from "./api-error";

/** Every successful response from this API is wrapped in this envelope. */
export interface ApiEnvelope<T> {
    success: true;
    data: T;
    status_code: number;
}

interface ApiErrorEnvelope {
    success: false;
    message: string;
    errors: string[];
    error_code: number;
    status_code: number;
}

export interface AuthTokens {
    accessToken: string;
    /** The bare JWT. The signed `s:…` cookie form is rejected by the API. */
    refreshToken: string;
    sessionKey: string;
}

/**
 * What the client needs from auth state, and nothing more.
 *
 * A port rather than a direct import of the Zustand store: it keeps the client
 * free of React and lets the refresh tests inject a fake with no mocking.
 */
export interface SessionStore {
    /** Synchronous by design — the request interceptor cannot await storage. */
    getTokens(): AuthTokens | null;
    setTokens(tokens: AuthTokens): Promise<void>;
    clearSession(): Promise<void>;
}

export interface HttpClientConfig {
    baseUrl: string;
    /** Pre-encoded "Basic <base64>" — see app.config.js. */
    basicAuthHeader: string;
    /** Generous by default: the dev server sleeps and its first response is slow. */
    timeoutMs?: number;
}

/** Endpoints that must never carry session headers or trigger a refresh. */
const UNAUTHENTICATED_PATHS = ["/auth/login", "/auth/login/verify_otp"];

const isUnauthenticatedPath = (url?: string) =>
    !!url && UNAUTHENTICATED_PATHS.some((path) => url.startsWith(path));

interface RetryableConfig extends InternalAxiosRequestConfig {
    /** Guarantees at most one retry per request, so a repeat 401 cannot loop. */
    retriedAfterRefresh?: boolean;
}

export class HttpClient {
    /**
     * The one refresh allowed to be in flight. Every concurrent 401 awaits this
     * same promise instead of starting its own refresh.
     */
    private refreshInFlight: Promise<AuthTokens> | null = null;

    private readonly instance: AxiosInstance;

    /**
     * A second, interceptor-free instance used only for the refresh call. This
     * makes a refresh loop structurally impossible rather than relying on a flag
     * that a later edit could forget to set.
     */
    private readonly refreshInstance: AxiosInstance;

    constructor(
        private readonly config: HttpClientConfig,
        private readonly session: SessionStore,
    ) {
        const base: AxiosRequestConfig = {
            baseURL: config.baseUrl,
            timeout: config.timeoutMs ?? 60_000,
            headers: {
                Authorization: config.basicAuthHeader,
                "X-Client-Platform": "mobile",
            },
        };

        this.instance = axios.create(base);
        this.refreshInstance = axios.create(base);

        this.instance.interceptors.request.use((request) => {
            if (!isUnauthenticatedPath(request.url)) {
                this.applyAuthHeaders(request, this.session.getTokens());
            }
            return request;
        });

        this.instance.interceptors.response.use(
            (response) => response,
            (error: AxiosError<ApiErrorEnvelope>) =>
                this.handleResponseError(error),
        );
    }

    /** Issue a request and unwrap the envelope, returning just `data`. */
    async request<T>(config: AxiosRequestConfig): Promise<T> {
        const response = await this.instance.request<ApiEnvelope<T>>(config);
        return response.data.data;
    }

    /**
     * As `request`, but returns the whole response. Needed only where headers
     * matter — verify_otp delivers two of the three tokens as cookies.
     */
    requestRaw<T>(
        config: AxiosRequestConfig,
    ): Promise<AxiosResponse<ApiEnvelope<T>>> {
        return this.instance.request<ApiEnvelope<T>>(config);
    }

    private applyAuthHeaders(
        request: InternalAxiosRequestConfig,
        tokens: AuthTokens | null,
    ) {
        if (!tokens) return;
        // Header casing is copied verbatim from the API docs' inconsistent spelling.
        request.headers.set("X-Access-Token", tokens.accessToken);
        request.headers.set("x-session-key", tokens.sessionKey);
    }

    private async handleResponseError(
        error: AxiosError<ApiErrorEnvelope>,
    ): Promise<AxiosResponse> {
        // No response at all: timeout, DNS, connection loss, or the sleeping dev
        // server. Never an authentication problem, so never a logout.
        if (!error.response) {
            throw new NetworkError(error.message, error.code);
        }

        const { status, data } = error.response;
        const request = error.config as RetryableConfig | undefined;
        const errorCode = data?.error_code ?? null;

        const isAuthFailure =
            status === 401 && !!request && !isUnauthenticatedPath(request.url);

        if (isAuthFailure) {
            const canRefresh =
                errorCode === API_ERROR_CODE.SESSION_EXPIRED &&
                !request.retriedAfterRefresh;

            if (canRefresh) {
                request.retriedAfterRefresh = true;
                let tokens: AuthTokens;
                try {
                    tokens = await this.refreshSession();
                } catch {
                    await this.session.clearSession();
                    throw new SessionExpiredError();
                }
                this.applyAuthHeaders(request, tokens);
                return this.instance.request(request);
            }

            // error_code 2, or a retry that 401'd again. Refresh cannot help.
            await this.session.clearSession();
            throw new SessionExpiredError();
        }

        throw new ApiError(
            status,
            errorCode,
            data?.message ?? error.message,
            data?.errors ?? [],
        );
    }

    /** Collapses concurrent refreshes onto a single request. */
    private refreshSession(): Promise<AuthTokens> {
        this.refreshInFlight ??= this.performRefresh().finally(() => {
            this.refreshInFlight = null;
        });
        return this.refreshInFlight;
    }

    private async performRefresh(): Promise<AuthTokens> {
        const current = this.session.getTokens();
        if (!current?.refreshToken || !current.sessionKey) {
            throw new SessionExpiredError();
        }

        const response = await this.refreshInstance.post<
            ApiEnvelope<RefreshResponseData>
        >("/auth/refresh_token", undefined, {
            headers: {
                "X-Refresh-Token": current.refreshToken,
                "x-session-key": current.sessionKey,
            },
        });

        // Unlike verify_otp, refresh returns all three tokens in the body, and
        // rotates the refresh token and session key — so persist all of them.
        const { access_token, refresh_token, session_key } = response.data.data;
        const tokens: AuthTokens = {
            accessToken: access_token,
            refreshToken: refresh_token,
            sessionKey: session_key,
        };
        await this.session.setTokens(tokens);
        return tokens;
    }
}

interface RefreshResponseData {
    access_token: string;
    refresh_token: string;
    session_key: string;
}
