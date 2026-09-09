# Readlens — Reports

A React Native (Expo) app for the Readlens founding mobile engineer assessment: OTP-based
login, a persistent authenticated session with token refresh, and a searchable, paginated
list of reports that can be created with an optional supporting file.

---

## Setup

Requires Node 20+, Yarn, and Xcode or Android Studio for a simulator.

```bash
yarn install
cp .env.example .env      # then fill in the values — see Configuration
yarn ios                  # or: yarn android
yarn test                 # unit tests
npx tsc --noEmit          # type check
```

Runs in Expo Go — no native build step, because the app uses no custom native modules.
Verified on both an iOS simulator and an Android emulator: login and OTP, session
persistence and refresh, list with search and pagination, report creation with an image
attachment, and detail.

## Configuration

All configuration is environment-driven. `.env` is gitignored and was never committed;
`.env.example` documents the required keys.

| Key | Purpose |
| --- | --- |
| `READLENS_API_BASE_URL` | API base URL, e.g. `https://dev.api.readlens.app/api/v1` |
| `READLENS_BASIC_AUTH_USERNAME` | HTTP Basic Auth username from the assessment brief |
| `READLENS_BASIC_AUTH_PASSWORD` | HTTP Basic Auth password from the assessment brief |

`app.config.js` reads these at build time and exposes the API URL plus a **pre-encoded**
`Basic …` header through `expo.extra`. Encoding happens in the config rather than at
runtime because React Native has no global `btoa`, which is what axios's `auth` option
depends on. Missing values warn at config time and throw at startup with an actionable
message, rather than surfacing later as unexplained 401s.

**On secrecy:** anything reaching the client is extractable from the binary, base64 or not.
Environment config keeps credentials out of version control — which is what the brief
asks — but it is not true secrecy. Only a backend proxy holding the credential
server-side would achieve that.

## Architecture

```
src/
  app/                     # Expo Router routes
    _layout.tsx            # providers + auth gate
    (auth)/                # login, verify-otp
    (app)/                 # reports list, detail, create
  features/
    auth/                  # api, session store, secure storage, schemas, hooks
    reports/               # api, hooks, pagination, file picking, create mutation
  lib/                     # http client, errors, config, query client
  components/              # Button, TextField, Screen, StateMessage, ListSkeleton
```

Feature-first and shallow. There is no `utils/` drawer: a helper used by one feature lives
in that feature.

| Concern | Choice | Why |
| --- | --- | --- |
| Navigation | Expo Router | Route groups give a declarative auth gate via `Stack.Protected` |
| Server state | TanStack Query | `useInfiniteQuery` covers pagination, dedup and the search race for free |
| Client state | Zustand | The session is the *only* global client state; Redux would be over-scaled |
| HTTP | Axios | Interceptors make single-flight refresh markedly cleaner than a fetch wrapper |
| Token storage | expo-secure-store | Keychain / Keystore. AsyncStorage would be plaintext on disk |
| Forms | React Hook Form + Yup | Schemas double as testable units |
| Lists | FlatList | Sufficient at this volume; FlashList is the scaling path |

`HttpClient` is a class because it owns real state — the in-flight refresh promise. Feature
APIs (`authApi`, `reportsApi`) are plain modules because they own none. A base class
extended per feature was considered and rejected: subclasses here would hold no state, and
the usual shape of that pattern gives each subclass its own axios instance and therefore
its own refresh guard, which quietly reintroduces the concurrent-refresh race.

## Authentication

```
login(email, password) → temp token + OTP emailed
  → verifyOtp(otp, email, token) → access_token (body) + refresh_token, session_key (cookies)
  → persist all three to SecureStore → hydrate Zustand → route into (app)
```

**Storage.** All three credentials go to the Keychain/Keystore via `expo-secure-store`. The
Zustand store holds them in memory for synchronous access — the request interceptor cannot
await storage — and writes through to secure storage on every change.

**Bootstrap.** The root layout holds the splash screen until SecureStore has been read, so a
returning user is never shown the login screen before being routed into the app.

**Refresh is single-flight.** On a 401 the response interceptor starts at most one refresh
and every concurrent 401 awaits that same promise. Each request is retried **once**, so a
repeat 401 cannot loop. The refresh call goes through a **second, interceptor-free axios
instance**, which makes a refresh loop structurally impossible rather than dependent on a
flag a later edit might forget to set.

**The API distinguishes its 401s, and so does the client** (see API discrepancies):

| `error_code` | Meaning | Action |
| --- | --- | --- |
| `1` | Access token expired | Refresh, then retry once |
| `2` | Credentials missing or invalid | Log out — refresh cannot help |
| `3` | Session superseded by a newer login | Log out |

**Network errors are not auth errors.** A timeout or connection loss produces a
`NetworkError` and never clears the session — logging a user out because the sleeping dev
server was slow would be a bug.

**Logout** clears SecureStore, resets the store, and calls `queryClient.clear()`. Cached
reports are user data; leaving them for the next account on the device would be a privacy
bug.

Refresh is **reactive** (401-triggered) rather than proactively decoding the JWT `exp` and
refreshing early. Reactive is simpler and needs no clock-skew handling; proactive refresh is
the documented upgrade path.

## API integration

Every request carries the Basic Auth header. Authenticated requests additionally carry
`X-Access-Token`, `x-session-key`, and `X-Client-Platform: mobile` — the inconsistent header
casing is copied verbatim from the API docs.

`HttpClient.request<T>()` unwraps the `{ success, data, status_code }` envelope so screens
never see it, and normalises failures into three types: `ApiError` (a definite server
answer, carrying `error_code`), `NetworkError` (no answer at all), and `SessionExpiredError`
(session cleared). Timeouts are 60s because the dev server sleeps and a short timeout would
report a healthy API as down.

**Reports list.** One `useInfiniteQuery` keyed on the debounced (350ms) search term. Because
the term is part of the query key, starting a new search while an older one is in flight
discards the stale result automatically — no manual cancellation — and pagination continues
under the active search with no extra code. `keepPreviousData` holds the current list on
screen while a new search resolves. `onEndReached` is guarded on
`hasNextPage && !isFetchingNextPage` against FlatList's habit of double-firing. Search and
pagination are server-side only.

**Create + upload** is two steps: `POST /reports/test` returns the report id and, when a
`file_type` was supplied, presigned S3 fields. The upload then posts directly to S3 with
**every policy field appended before the file** — S3 ignores fields that follow `file`, and
getting this wrong yields an opaque 403. The S3 request is a bare axios call so the API's
Basic Auth header never reaches a third party or breaks the presigned signature.
`file_type` is derived from the picked asset's MIME type, falling back to its extension,
rather than asking the user to classify their own file.

**Partial failure is a designed state.** The report is created *before* the upload runs. If
S3 fails, the UI says the report was created but the file did not attach, and offers a retry
of the upload alone using the presigned fields already in hand. Re-running creation would
duplicate the report, so the form is hidden once this state is reached.

**The async Lambda gap.** A freshly uploaded file is briefly absent from the detail
response. The detail screen renders the report immediately with a "processing" placeholder,
refetches on focus, and polls every 5s up to 6 attempts — capped, because uncapped polling
against a server that sleeps is worse than a stale placeholder.

## API discrepancies found

Recon against the live API turned up four behaviours the written spec does not describe.
Each is load-bearing.

1. **`verify_otp` does not return `refresh_token` or `session_key` in its body.** They arrive
   as `HttpOnly` `Set-Cookie` headers. The app parses them out and stores them in the
   Keychain rather than relying on React Native's cookie jar, whose storage is not secure
   and whose clearing on logout is unreliable. Cookie-based auth was tested and **rejected**
   by the server, so reading the headers is the only path.
2. **`X-Client-Platform: mobile` suppresses those cookies.** Sending it on `verify_otp`
   returns a response identical in every other header with both cookies absent — and no
   tokens in the body either, leaving the client unable to build a session. The spec asks
   for this header on *authenticated* requests only, so the client now scopes it to those.
3. **`X-Refresh-Token` requires the bare JWT**, not the signed `s:…` cookie value, which is
   rejected. `x-session-key` accepts either form. `x-session-key` is required on *every*
   authenticated call, not just refresh.
4. **`error_code` distinguishes the three 401s** (table above) — undocumented, and the
   reason the client can avoid spending a doomed refresh round-trip.

Parsing the cookies needs care: iOS folds multiple `Set-Cookie` headers into one
comma-joined string, and each carries an `Expires` value containing its own comma, so
splitting must use a lookahead for a new `cookie-name=` pair. This is unit-tested against
all four shapes the header can take.

## Testing

`yarn test` — 27 tests across 5 suites, all passing.

Testing is deliberately tiered rather than broad. The suite covers the logic where a bug
would be silent and expensive:

- **Refresh lifecycle** (7 tests) — concurrent 401s produce exactly one refresh; the retry
  carries the new token; a network error never logs out; failed refresh clears the session;
  `error_code: 2` logs out without attempting a refresh; at most one retry, so no loop.
- **Set-Cookie parsing** — the iOS comma-fold, the `Expires` comma, all four header shapes,
  and signed-cookie unwrapping.
- **Pagination boundary** — `has_next: false` stops infinite scroll, including when the API
  sends a contradictory `next_page`.
- **File-type resolution** and **form schemas**.

`HttpClient` takes an optional axios `adapter`, which is the seam the refresh tests use to
script server behaviour without a network.

**Not covered, deliberately:** component rendering tests and E2E (Maestro/Detox). At this
scale their setup cost outweighs the signal, and the refresh logic — the part most likely to
break silently — is fully covered above. Stated as a choice rather than left as a silent gap.

## Assumptions

- **No resend-OTP or forgot-password endpoint** is documented, so the UI offers neither.
- **Refresh rotates both the refresh token and the session key.** The client persists all
  three values after every refresh. Rotated-out values were observed to remain valid, so
  single-flight refresh here prevents *redundant requests* rather than a correctness bug —
  but relying on that leniency would be fragile.
- **A new login invalidates earlier sessions** (`error_code: 3`), while rotation within one
  session does not.
- The user object is not persisted; it is held in memory and repopulated on refresh. No
  screen currently depends on it after a cold start.

## Known limitations

- **Web is out of scope.** `expo-secure-store` has no web implementation, so the app would
  throw rather than degrade.
- PDFs open in an external browser rather than rendering inline.
- No offline banner. Requests fail with a clear, retryable message instead.
- The polling cap means a file processed unusually slowly needs a manual pull-to-refresh.
- The partial-upload-failure path is implemented and unit-reasoned but has not been observed
  against a real S3 failure, since the upload succeeded on every manual run.
