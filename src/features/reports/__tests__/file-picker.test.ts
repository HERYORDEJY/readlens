import { resolveFileType } from "../file-picker";

describe("resolveFileType", () => {
  it("maps MIME types to the uppercase values the API expects", () => {
    expect(resolveFileType("image/jpeg", "a.jpg")).toBe("JPEG");
    expect(resolveFileType("image/png", "a.png")).toBe("PNG");
    expect(resolveFileType("image/webp", "a.webp")).toBe("WEBP");
    expect(resolveFileType("application/pdf", "a.pdf")).toBe("PDF");
  });

  it("falls back to the extension when the picker reports no MIME type", () => {
    // iOS returns a null mimeType under limited photo-library permissions.
    expect(resolveFileType(null, "scan.PDF")).toBe("PDF");
    expect(resolveFileType(undefined, "photo.jpeg")).toBe("JPEG");
  });

  it("rejects anything unsupported rather than guessing", () => {
    expect(resolveFileType("video/mp4", "clip.mp4")).toBeNull();
    expect(resolveFileType(null, "notes")).toBeNull();
    expect(resolveFileType(null, null)).toBeNull();
  });
});
