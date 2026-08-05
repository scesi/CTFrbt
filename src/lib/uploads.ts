import path from "path";

export const PUBLIC_DIR = path.resolve(process.cwd(), "public");
export const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function sanitizeUploadName(name: string): string {
  const base = path.basename(name);
  const cleaned = base.replace(/[^a-zA-Z0-9._ -]/g, "_").trim();
  return cleaned || "upload";
}

export function uploadDirFor(challengeId: string): string {
  return path.join(UPLOADS_DIR, challengeId);
}
