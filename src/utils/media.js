const LEGACY_UPLOAD_HOST = 'sdg-forum.truesurvi4.xyz';
const CURRENT_UPLOAD_HOST = 'sdg-forum-api.truesurvi4.xyz';

/**
 * Ensure media URLs that point to the legacy upload host use the API domain instead.
 * Keeps other URLs untouched and gracefully ignores relative paths.
 */
export const ensureApiUploadsHost = (url) => {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === LEGACY_UPLOAD_HOST) {
      parsed.hostname = CURRENT_UPLOAD_HOST;
      return parsed.toString();
    }
  } catch {
    // Ignore parsing errors – we'll fall back to string replacement below.
  }

  // Handle protocol-relative URLs (e.g. //host/path).
  if (trimmed.startsWith(`//${LEGACY_UPLOAD_HOST}`)) {
    return `https://${CURRENT_UPLOAD_HOST}${trimmed.slice(LEGACY_UPLOAD_HOST.length + 2)}`;
  }

  // As a final fallback, replace any direct occurrences of the legacy host.
  return trimmed.replaceAll(LEGACY_UPLOAD_HOST, CURRENT_UPLOAD_HOST);
};
