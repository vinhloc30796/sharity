// Global per-image limit used across all uploads.
// Convex sends files base64-encoded, which adds ~33% overhead.
// 12 MiB binary → ~16 MiB base64, safely under Convex's 16 MiB args limit.
export const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB per file
