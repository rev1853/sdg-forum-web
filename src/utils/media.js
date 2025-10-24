const LEGACY_UPLOAD_HOST = 'sdg-forum.truesurvi4.xyz';
const CURRENT_UPLOAD_HOST = 'sdg-forum-api.truesurvi4.xyz';

const PROFILE_IMAGE_KEYS = [
  'profile_picture',
  'profilePicture',
  'profile_picture_url',
  'profilePictureUrl',
  'profile_image',
  'profileImage',
  'avatar',
  'avatar_url',
  'avatarUrl',
  'google_picture',
  'googlePicture',
  'photo',
  'photo_url',
  'photoUrl',
  'image',
  'image_url',
  'imageUrl',
];

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
      parsed.protocol = 'https:';
      parsed.port = '';
      return parsed.toString();
    }
    return trimmed;
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

/**
 * Resolve a potentially relative media path against the API base URL (or current origin).
 * Normalises legacy hosts to the current API host.
 */
export const resolveMediaUrl = (source, baseUrl) => {
  if (!source || typeof source !== 'string') return null;
  const trimmed = source.trim();
  if (!trimmed) return null;

  if (/^(data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return ensureApiUploadsHost(trimmed);
  }

  if (trimmed.startsWith('//')) {
    return ensureApiUploadsHost(`https:${trimmed}`);
  }

  const normalised = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;

  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      return ensureApiUploadsHost(`${parsed.origin}/${normalised}`);
    } catch {
      // Fall through to window origin / relative handling.
    }
  }

  if (typeof window !== 'undefined' && window?.location?.origin) {
    return ensureApiUploadsHost(`${window.location.origin}/${normalised}`);
  }

  return ensureApiUploadsHost(`/${normalised}`);
};

/**
 * Resolve the best available profile image URL for a given user/person object.
 */
export const resolveProfileImageUrl = (person, baseUrl) => {
  if (!person || typeof person !== 'object') {
    return null;
  }

  const candidates = [];

  for (const key of PROFILE_IMAGE_KEYS) {
    const value = person[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      candidates.push(value);
    } else if (value && typeof value === 'object') {
      if (typeof value.url === 'string') candidates.push(value.url);
      if (typeof value.src === 'string') candidates.push(value.src);
      if (typeof value.path === 'string') candidates.push(value.path);
    }
  }

  const nestedProfile = person.profile;
  if (nestedProfile && typeof nestedProfile === 'object') {
    for (const key of PROFILE_IMAGE_KEYS) {
      const value = nestedProfile[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        candidates.push(value);
      } else if (value && typeof value === 'object') {
        if (typeof value.url === 'string') candidates.push(value.url);
        if (typeof value.src === 'string') candidates.push(value.src);
        if (typeof value.path === 'string') candidates.push(value.path);
      }
    }
  }

  for (const candidate of candidates) {
    const resolved = resolveMediaUrl(candidate, baseUrl);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};
