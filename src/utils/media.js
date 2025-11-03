const LEGACY_UPLOAD_HOST = 'sdg-forum.truesurvi4.xyz';
const CURRENT_UPLOAD_HOST = 'sdg-forum-api.truesurvi4.xyz';

const PROFILE_IMAGE_KEYS = [
  'profile_picture',
  'profilePicture',
  'profile_picture_url',
  'profilePictureUrl',
  'profile_picture_path',
  'profilePicturePath',
  'profile_image',
  'profileImage',
  'avatar',
  'avatar_url',
  'avatarUrl',
  'avatar_path',
  'avatarPath',
  'google_picture',
  'googlePicture',
  'picture',
  'picture_url',
  'pictureUrl',
  'photo',
  'photo_url',
  'photoUrl',
  'image',
  'image_url',
  'imageUrl',
  'thumbnail',
  'thumbnail_url',
  'thumbnailUrl',
];

const OBJECT_MEDIA_KEYS = [
  'url',
  'src',
  'path',
  'href',
  'link',
  'secure_url',
  'secureUrl',
  'downloadUrl',
  'download_url',
  'default',
];

const NESTED_PROFILE_OBJECT_KEYS = [
  'profile',
  'profile_data',
  'profileData',
  'author',
  'author_profile',
  'authorProfile',
  'user',
  'user_profile',
  'userProfile',
  'owner',
  'owner_profile',
  'ownerProfile',
  'member',
  'member_profile',
  'memberProfile',
  'creator',
  'creator_profile',
  'creatorProfile',
  'account',
  'account_profile',
  'accountProfile',
  'sender',
  'sender_profile',
  'senderProfile',
  'participant',
  'participant_profile',
  'participantProfile',
  'person',
  'details',
  'info',
  'data',
];

const STRING_KEY_INFIXES = ['avatar', 'profile', 'picture', 'photo', 'image'];

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

const normaliseObjectMedia = (value, baseUrl) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  // Guard against File/Blob instances which need special handling at upload time.
  if (typeof File !== 'undefined' && value instanceof File) return null;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return null;

  for (const key of OBJECT_MEDIA_KEYS) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      const resolved = resolveMediaUrl(candidate, baseUrl);
      if (resolved) return resolved;
    }
  }

  return null;
};

const shouldExploreKey = (key) => {
  if (!key || typeof key !== 'string') return false;
  const lowerKey = key.toLowerCase();
  if (NESTED_PROFILE_OBJECT_KEYS.some((entry) => entry && lowerKey === entry.toLowerCase())) {
    return true;
  }
  return STRING_KEY_INFIXES.some((fragment) => lowerKey.includes(fragment));
};

const objectHasMediaHints = (value) => {
  if (!value || typeof value !== 'object') return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.some((childKey) => {
    const lower = String(childKey).toLowerCase();
    return (
      PROFILE_IMAGE_KEYS.some((profileKey) => profileKey && lower === profileKey.toLowerCase()) ||
      OBJECT_MEDIA_KEYS.some((objectKey) => objectKey && lower === objectKey.toLowerCase()) ||
      STRING_KEY_INFIXES.some((fragment) => lower.includes(fragment))
    );
  });
};

const normaliseMediaCandidate = (candidate, baseUrl) => {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === 'string') {
    return resolveMediaUrl(candidate, baseUrl);
  }

  if (Array.isArray(candidate)) {
    for (const entry of candidate) {
      const resolved = normaliseMediaCandidate(entry, baseUrl);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  }

  if (typeof candidate === 'object') {
    const resolved = normaliseObjectMedia(candidate, baseUrl);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

/**
 * Resolve the best available profile image URL for a given user/person object.
 */
export const resolveThreadImage = (image, baseUrl) => {
  if (!image) return null;

  const source =
    typeof image === 'string'
      ? image
      : image?.url ?? image?.src ?? image?.path ?? image?.location ?? null;

  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return ensureApiUploadsHost(source);

  const normalized = source.startsWith('/') ? source.slice(1) : source;

  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      return ensureApiUploadsHost(`${parsed.origin}/${normalized}`);
    } catch (error) {
      console.warn('Failed to parse API base URL for image resolution', error);
    }
  }

  if (typeof window !== 'undefined') {
    return ensureApiUploadsHost(`${window.location.origin}/${normalized}`);
  }

  return ensureApiUploadsHost(`/${normalized}`);
};

export const resolveProfileImageUrl = (person, baseUrl) => {
  if (!person || typeof person !== 'object') {
    return normaliseMediaCandidate(person, baseUrl);
  }

  const queue = Array.isArray(person) ? [...person] : [person];
  const visited = typeof WeakSet === 'function' ? new WeakSet() : new Set();
  const maxIterations = 50;
  let processed = 0;

  while (queue.length > 0 && processed < maxIterations) {
    const current = queue.shift();
    processed += 1;

    if (!current) {
      continue;
    }

    const resolvedDirect = normaliseMediaCandidate(current, baseUrl);
    if (resolvedDirect) {
      return resolvedDirect;
    }

    if (typeof current !== 'object') {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    for (const key of PROFILE_IMAGE_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        continue;
      }

      const resolved = normaliseMediaCandidate(current[key], baseUrl);
      if (resolved) {
        return resolved;
      }
    }

    for (const [key, value] of Object.entries(current)) {
      if (!value) {
        continue;
      }

      if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        if (STRING_KEY_INFIXES.some((fragment) => lowerKey.includes(fragment))) {
          const resolved = normaliseMediaCandidate(value, baseUrl);
          if (resolved) {
            return resolved;
          }
        }
        continue;
      }

      if (Array.isArray(value)) {
        queue.push(...value);
        continue;
      }

      if (typeof value === 'object') {
        if (shouldExploreKey(key) || objectHasMediaHints(value)) {
          queue.push(value);
        }
      }
    }
  }

  return null;
};
