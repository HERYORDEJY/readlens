import { extractSetCookie, parseSetCookie, unsignCookieValue } from "../set-cookie";

// The real header shape from the API: HttpOnly, Secure, and an Expires value
// whose own comma is what breaks naive splitting.
const REFRESH =
  "refresh_token=s%3Aheader.payload.sig.cookiesig; Max-Age=2592000; Path=/api/v1/auth/refresh_token; Expires=Fri, 02 Oct 2026 05:32:24 GMT; HttpOnly; Secure; SameSite=None";
const SESSION =
  "session_key=s%3A02k60AstO96Lf7LRsm1-KBni6C8k129pAYYwSjhNhgg.sig; Max-Age=2592000; Path=/; Expires=Fri, 02 Oct 2026 05:32:24 GMT; HttpOnly; Secure; SameSite=None";

describe("parseSetCookie", () => {
  it("splits cookies that iOS folded into a single comma-joined string", () => {
    const cookies = parseSetCookie([`${REFRESH}, ${SESSION}`]);

    expect(Object.keys(cookies).sort()).toEqual(["refresh_token", "session_key"]);
    expect(cookies.refresh_token).toBe("s:header.payload.sig.cookiesig");
  });

  it("is not fooled by the comma inside Expires", () => {
    expect(parseSetCookie([REFRESH]).refresh_token).toBe("s:header.payload.sig.cookiesig");
  });

  it("handles a proper array, a bare string, and an absent header", () => {
    expect(Object.keys(parseSetCookie([REFRESH, SESSION]))).toHaveLength(2);
    expect(Object.keys(parseSetCookie(`${REFRESH}, ${SESSION}`))).toHaveLength(2);
    expect(parseSetCookie(undefined)).toEqual({});
  });
});

describe("unsignCookieValue", () => {
  it("strips the express signature so the bare JWT remains", () => {
    // The API rejects the signed form on X-Refresh-Token, so this is required.
    expect(unsignCookieValue("s:header.payload.sig.cookiesig")).toBe("header.payload.sig");
  });

  it("leaves an unsigned value alone", () => {
    expect(unsignCookieValue("plain-value")).toBe("plain-value");
  });
});

describe("extractSetCookie", () => {
  it("reads from an AxiosHeaders-style getter", () => {
    const headers = { get: (name: string) => (name === "set-cookie" ? [REFRESH] : undefined) };
    expect(extractSetCookie(headers)).toEqual([REFRESH]);
  });

  it("falls back to a case-insensitive key sweep", () => {
    expect(extractSetCookie({ "Set-Cookie": [REFRESH] })).toEqual([REFRESH]);
  });

  it("returns undefined when the header is absent", () => {
    expect(extractSetCookie({ "content-type": "application/json" })).toBeUndefined();
  });
});
