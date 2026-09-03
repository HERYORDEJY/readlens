/**
 * Parsing for `Set-Cookie` response headers.
 *
 * Needed because the API delivers `refresh_token` and `session_key` as cookies
 * on verify_otp rather than in the JSON body. Two platform quirks make this
 * less trivial than it looks, both verified on a simulator:
 *
 * 1. iOS folds multiple Set-Cookie headers into ONE comma-joined string. Each
 *    cookie also carries `Expires=Fri, 02 Oct 2026 …`, whose own comma makes a
 *    naive `split(",")` produce plausible-looking garbage rather than an error.
 * 2. The value can arrive as a string[], a bare string, or be absent entirely.
 */

/**
 * Split on a comma only where a new `cookie-name=` pair follows. Cookie names
 * are RFC 7230 tokens, so the character class is explicit — this is what makes
 * the comma inside `Expires` safe.
 */
const COOKIE_BOUNDARY = /,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/;

/** Parse raw Set-Cookie header(s) into a name -> value map. Attributes are discarded. */
export function parseSetCookie(raw: string | string[] | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const header of ([] as string[]).concat(raw ?? [])) {
    for (const part of header.split(COOKIE_BOUNDARY)) {
      const pair = part.trim().split(";")[0] ?? "";
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      cookies[pair.slice(0, eq).trim()] = decodeURIComponent(pair.slice(eq + 1).trim());
    }
  }

  return cookies;
}

/**
 * Strip an express signed-cookie wrapper: `s:<value>.<hmac>` -> `<value>`.
 *
 * Required, not cosmetic: the API rejects the signed form on `X-Refresh-Token`
 * with a 401 and only accepts the bare JWT.
 */
export function unsignCookieValue(value: string): string {
  if (!value.startsWith("s:")) return value;
  const body = value.slice(2);
  const lastDot = body.lastIndexOf(".");
  return lastDot === -1 ? body : body.slice(0, lastDot);
}
