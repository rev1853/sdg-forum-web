import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiMessageSquare, FiRepeat, FiShare2 } from 'react-icons/fi';
import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { resolveProfileImageUrl, resolveThreadImage } from '@utils/media';
import { useLikedThreads } from '@/hooks/useLikedThreads';

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const makeInitials = (value) => {
    if (!value) return 'U';
    const tokens = value.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return 'U';
    if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
    return `${tokens[0][0]}${tokens[tokens.length - 1][0]}`.toUpperCase();
};

const snippet = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/\s+/g, ' ').trim();
};

const getThreadLink = (thread) => {
    if (thread?.id) {
        return `/forum/threads/${thread.id}`;
    }
    if (thread?.slug) {
        return `/forum/threads/${thread.slug}`;
    }
    return '/forum/threads';
};

const getAuthorInfo = (thread, baseUrl) => {
    const candidates = [
        thread?.author,
        thread?.author_profile,
        thread?.authorProfile,
        thread?.user,
        thread?.user_profile,
        thread?.userProfile,
        thread?.profile,
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;

        if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed) {
                return { name: trimmed, avatar: null, initials: makeInitials(trimmed) };
            }
        } else if (typeof candidate === 'object') {
            const name = candidate.name ?? candidate.username ?? candidate.displayName ?? null;
            const avatar = resolveProfileImageUrl(candidate, baseUrl);
            if (name) {
                return { name, avatar, initials: makeInitials(name) };
            }
        }
    }

    return { name: 'Community member', avatar: null, initials: 'CM' };
};

const toSnakeCase = (value) => value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const interpretFlagValue = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
        const normalised = value.trim().toLowerCase();
        return ['true', '1', 'yes', 'liked', 'reposted', 'shared', 'y'].includes(normalised);
    }
    return false;
};

const resolveViewerFlag = (source, candidates) => {
    if (!source || typeof source !== 'object') return false;
    return candidates.some((key) => {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            return interpretFlagValue(source[key]);
        }
        const snakeKey = toSnakeCase(key);
        if (Object.prototype.hasOwnProperty.call(source, snakeKey)) {
            return interpretFlagValue(source[snakeKey]);
        }
        return false;
    });
};

const LIKE_FLAG_KEYS = ['viewerHasLiked', 'viewerLiked', 'likedByUser', 'hasLiked', 'isLiked', 'liked', 'viewerLike'];
const REPOST_FLAG_KEYS = ['viewerHasReposted', 'viewerReposted', 'hasReposted', 'isReposted', 'reposted'];

const ThreadCard = ({ thread }) => {
    const { threads, baseUrl } = useApi();
    const { token } = useAuth();
    const { isLiked, toggleLike } = useLikedThreads();

    const [counts, setCounts] = useState({
        likes: thread?.counts?.likes ?? 0,
        replies: thread?.counts?.replies ?? (Array.isArray(thread?.replies) ? thread.replies.length : 0),
        reposts: thread?.counts?.reposts ?? 0,
    });

    // Initialize interaction state based on thread data OR local storage
    const [hasLiked, setHasLiked] = useState(() => {
        const viewerSource = thread.viewerInteractions ?? thread.viewer ?? thread;
        const apiLiked = resolveViewerFlag(viewerSource, LIKE_FLAG_KEYS) || resolveViewerFlag(thread, LIKE_FLAG_KEYS);
        return apiLiked || isLiked(thread.id);
    });

    // Sync local state with hook when it changes (e.g. on mount or storage update)
    useEffect(() => {
        const likedInStorage = isLiked(thread.id);
        if (likedInStorage !== hasLiked) {
            // Only update if storage says true and we say false (to avoid overwriting API false with storage false if API was true?)
            // Actually, storage is the source of truth for "my actions on this device"
            if (likedInStorage) setHasLiked(true);
        }
    }, [isLiked, thread.id, hasLiked]); // Added hasLiked to dependencies to prevent infinite loop if likedInStorage is false and hasLiked is true

    // Repost state (kept for logic but UI removed)
    const [hasReposted, setHasReposted] = useState(() => {
        const viewerSource = thread.viewerInteractions ?? thread.viewer ?? thread;
        return resolveViewerFlag(viewerSource, REPOST_FLAG_KEYS) || resolveViewerFlag(thread, REPOST_FLAG_KEYS);
    });

    const [isProcessingLike, setIsProcessingLike] = useState(false);
    const [isProcessingRepost, setIsProcessingRepost] = useState(false);

    const link = getThreadLink(thread);
    const imageUrl = resolveThreadImage(thread?.image ?? thread?.image_url, baseUrl);
    const author = getAuthorInfo(thread, baseUrl);

    const handleLike = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!token) return; // Ideally show auth prompt, but silent fail for now on card
        if (isProcessingLike) return;

        try {
            setIsProcessingLike(true);
            if (hasLiked) {
                await threads.unlikeThread(thread.id);
                setHasLiked(false);
                setCounts(prev => ({ ...prev, likes: Math.max(prev.likes - 1, 0) }));
                toggleLike(thread.id, false);
            } else {
                await threads.likeThread(thread.id);
                setHasLiked(true);
                setCounts(prev => ({ ...prev, likes: prev.likes + 1 }));
                toggleLike(thread.id, true);
            }
        } catch (error) {
            console.error('Failed to toggle like', error);
        } finally {
            setIsProcessingLike(false);
        }
    };

    const handleRepost = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!token) return;
        if (isProcessingRepost) return;

        try {
            setIsProcessingRepost(true);
            if (hasReposted) {
                await threads.removeRepost(thread.id);
                setHasReposted(false);
                setCounts(prev => ({ ...prev, reposts: Math.max(prev.reposts - 1, 0) }));
            } else {
                await threads.repostThread(thread.id);
                setHasReposted(true);
                setCounts(prev => ({ ...prev, reposts: prev.reposts + 1 }));
            }
        } catch (error) {
            console.error('Failed to toggle repost', error);
        } finally {
            setIsProcessingRepost(false);
        }
    };

    const handleShare = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const shareUrl = `${window.location.origin}${link}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: thread.title,
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
                // Optional: Show toast
            }
        } catch (error) {
            console.error('Failed to share', error);
        }
    };

    return (
        <Link
            to={link}
            className="thread-card group"
            aria-label={`Open thread ${thread?.title ?? 'thread'}`}
        >
            {imageUrl && (
                <div className="thread-card__media" aria-hidden="true">
                    <img src={imageUrl} alt="" loading="lazy" />
                </div>
            )}

            <div className="thread-card__content">
                <div className="thread-card__meta">
                    {thread.category && (
                        <span className="thread-card__goal">
                            {thread.category.name || `Goal ${thread.category.sdg_number}`}
                        </span>
                    )}
                </div>
                <h3 className="thread-card__title">{thread.title}</h3>
                <p
                    className="thread-card__snippet"
                    style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {snippet(thread.summary ?? thread.body ?? thread.content) || 'No summary provided yet.'}
                </p>

                <div className="thread-card__footer">
                    <div className="thread-card__author">
                        {author.avatar ? (
                            <img src={author.avatar} alt={author.name} className="thread-card__author-avatar" />
                        ) : (
                            <div className="thread-card__author-avatar bg-[var(--color-accent-secondary)] flex items-center justify-center text-xs font-bold text-white">
                                {author.initials}
                            </div>
                        )}
                        <div className="thread-card__author-meta">
                            <span>{author.name}</span>
                            <small>{formatDate(thread.created_at)}</small>
                        </div>
                    </div>

                    <div className="thread-card__actions">
                        <button
                            className={`thread-card__action ${hasLiked ? 'is-active' : ''}`}
                            onClick={handleLike}
                            title={hasLiked ? "Unlike" : "Like"}
                        >
                            <FiHeart className={hasLiked ? "fill-current" : ""} />
                            <span>{counts.likes}</span>
                        </button>

                        <button
                            className="thread-card__action"
                            title="Replies"
                        >
                            <FiMessageSquare />
                            <span>{counts.replies}</span>
                        </button>

                        <button
                            className="thread-card__action"
                            onClick={handleShare}
                            title="Share"
                        >
                            <FiShare2 />
                        </button>
                    </div>
                </div>
            </div>
        </Link>

    );
};

export default ThreadCard;
