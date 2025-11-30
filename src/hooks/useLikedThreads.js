import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const getStorageKey = (userId) => `sdg_liked_threads_${userId}`;

export const useLikedThreads = () => {
    const { user } = useAuth();
    const [likedThreadIds, setLikedThreadIds] = useState(new Set());

    // Load from local storage when user changes
    useEffect(() => {
        if (!user?.id) {
            setLikedThreadIds(new Set());
            return;
        }

        try {
            const key = getStorageKey(user.id);
            const raw = localStorage.getItem(key);
            if (raw) {
                const ids = JSON.parse(raw);
                if (Array.isArray(ids)) {
                    setLikedThreadIds(new Set(ids));
                }
            }
        } catch (error) {
            console.error('Failed to load liked threads', error);
        }
    }, [user?.id]);

    const isLiked = useCallback((threadId) => {
        return likedThreadIds.has(threadId);
    }, [likedThreadIds]);

    const toggleLike = useCallback((threadId, shouldBeLiked) => {
        if (!user?.id) return;

        setLikedThreadIds((prev) => {
            const next = new Set(prev);
            if (shouldBeLiked) {
                next.add(threadId);
            } else {
                next.delete(threadId);
            }

            // Persist to local storage
            try {
                const key = getStorageKey(user.id);
                localStorage.setItem(key, JSON.stringify(Array.from(next)));
            } catch (error) {
                console.error('Failed to save liked threads', error);
            }

            return next;
        });
    }, [user?.id]);

    return { isLiked, toggleLike };
};
