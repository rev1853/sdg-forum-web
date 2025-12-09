import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { resolveProfileImageUrl } from '@utils/media';
import ForumNavbar from '../components/forum/ForumNavbar';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiMail, FiAtSign, FiCamera, FiTrash2, FiRefreshCw, FiSave, FiShield } from 'react-icons/fi';

const ProfilePage = () => {
  const { users, baseUrl } = useApi();
  const { user, token, refreshUser } = useAuth();

  const [formState, setFormState] = useState(() => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    username: user?.username ?? '',
  }));
  const [newAvatar, setNewAvatar] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(() => resolveProfileImageUrl(user, baseUrl));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: '' });
  const [userThreads, setUserThreads] = useState([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  const originalValues = useMemo(
    () => ({
      name: user?.name ?? '',
      email: user?.email ?? '',
      username: user?.username ?? '',
      avatar: resolveProfileImageUrl(user, baseUrl),
    }),
    [user, baseUrl],
  );

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const loadUserThreads = async () => {
      setIsLoadingThreads(true);
      try {
        const response = await users.listThreads(user.id);
        if (cancelled) return;
        const data = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.threads)
            ? response.threads
            : [];
        setUserThreads(data);
      } catch (err) {
        console.error('Failed to load user threads', err);
      } finally {
        if (!cancelled) setIsLoadingThreads(false);
      }
    };

    loadUserThreads();
    return () => { cancelled = true; };
  }, [users, user?.id]);

  useEffect(() => {
    if (!user) return;
    setFormState(current => {
      // Only update if values are missing or if user object has changed significantly
      // This prevents overwriting user input if they are typing while a background refresh happens
      if (current.name === '' && current.email === '' && current.username === '') {
        return {
          name: user.name ?? '',
          email: user.email ?? '',
          username: user.username ?? '',
        };
      }
      return current;
    });

    // Update preview if it hasn't been modified by user
    if (!newAvatar && !removeAvatar) {
      setPreviewUrl(resolveProfileImageUrl(user, baseUrl));
    }
  }, [user, baseUrl, newAvatar, removeAvatar]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNewAvatar(file);
    setRemoveAvatar(false);
    setFeedback({ type: null, message: '' });
    setPreviewUrl((current) => {
      if (current && current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });
  };

  const handleRemoveAvatar = () => {
    setNewAvatar(null);
    setRemoveAvatar(true);
    setPreviewUrl(null);
  };

  const hasChanges = useMemo(() => {
    const trimmedName = formState.name.trim();
    const trimmedEmail = formState.email.trim();
    const trimmedUsername = formState.username.trim();

    return (
      trimmedName !== originalValues.name.trim() ||
      trimmedEmail !== originalValues.email.trim() ||
      trimmedUsername !== originalValues.username.trim() ||
      Boolean(newAvatar) ||
      (removeAvatar && Boolean(originalValues.avatar))
    );
  }, [formState, originalValues, newAvatar, removeAvatar]);

  const previewImage = removeAvatar ? null : previewUrl ?? originalValues.avatar;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id) return;

    if (!hasChanges) {
      setFeedback({ type: 'info', message: 'No changes to update.' });
      return;
    }

    const payload = {};
    const trimmedName = formState.name.trim();
    const trimmedEmail = formState.email.trim();
    const trimmedUsername = formState.username.trim();

    if (trimmedName && trimmedName !== originalValues.name.trim()) {
      payload.name = trimmedName;
    }
    if (trimmedEmail && trimmedEmail !== originalValues.email.trim()) {
      payload.email = trimmedEmail;
    }
    if (trimmedUsername && trimmedUsername !== originalValues.username.trim()) {
      payload.username = trimmedUsername;
    }

    if (newAvatar) {
      payload.profilePicture = newAvatar;
    }

    if (removeAvatar && originalValues.avatar) {
      payload.removeProfilePicture = true;
    }

    if (Object.keys(payload).length === 0) {
      setFeedback({ type: 'info', message: 'Nothing new to update yet.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback({ type: null, message: '' });

      const response = await users.updateUser(user.id, payload);
      const updated = response?.user ?? (await refreshUser()) ?? null;

      if (updated) {
        setFeedback({ type: 'success', message: 'Profile updated successfully.' });
        // Update form state with new values to reset "hasChanges"
        setFormState({
          name: updated.name ?? '',
          email: updated.email ?? '',
          username: updated.username ?? '',
        });
        setPreviewUrl(resolveProfileImageUrl(updated, baseUrl));
        setNewAvatar(null);
        setRemoveAvatar(false);
      } else {
        setFeedback({ type: 'info', message: 'Profile saved, but we could not refresh your details right now.' });
      }
    } catch (error) {
      console.error('Failed to update profile', error);
      const message =
        error?.data?.message ||
        error?.data?.error ||
        error?.message ||
        'Unable to update your profile at the moment.';
      setFeedback({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <section className="themed-page forum-page profile-page">
        <title>Profile Settings • SDG Forum</title>
        <ForumNavbar />
        <div className="profile-locked">
          <div className="profile-locked__content">
            <FiShield size={48} className="profile-locked__icon" />
            <h1>Profile settings</h1>
            <p>You need to be signed in to manage your profile.</p>
            <Link to="/auth/login" className="primary-button">
              Sign in to continue
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="themed-page forum-page profile-page">
      <title>Profile Settings • SDG Forum</title>
      <ForumNavbar />

      <div className="profile-page__container">
        <header className="profile-page__intro">
          <span className="badge">Your account</span>
          <h1>Profile settings</h1>
          <p>Update how others see you across the SDG Forum experience.</p>
        </header>

        <div className="profile-page__grid">
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-form__section">
              <div className="profile-form__avatar-upload">
                <div className="avatar-preview">
                  {previewImage ? (
                    <img src={previewImage} alt="Profile preview" />
                  ) : (
                    <span className="avatar-fallback">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
                  )}
                  <div className="avatar-overlay">
                    <FiCamera size={24} />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="avatar-input"
                    aria-label="Upload profile picture"
                  />
                </div>
                <div className="avatar-actions">
                  <h3>Profile Picture</h3>
                  <p>PNG or JPG up to 2MB</p>
                  {previewImage && (
                    <button type="button" className="text-button text-danger" onClick={handleRemoveAvatar}>
                      <FiTrash2 /> Remove picture
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-form__fields">
              <div className="form-field">
                <label htmlFor="profile-name">
                  <FiUser className="form-icon" /> Full name
                </label>
                <input
                  id="profile-name"
                  name="name"
                  placeholder="How should we address you?"
                  value={formState.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label htmlFor="profile-username">
                  <FiAtSign className="form-icon" /> Username
                </label>
                <input
                  id="profile-username"
                  name="username"
                  placeholder="Pick a unique handle"
                  value={formState.username}
                  onChange={handleChange}
                />
              </div>

              <div className="form-field">
                <label htmlFor="profile-email">
                  <FiMail className="form-icon" /> Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formState.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {feedback.message && (
              <div className={`form-feedback form-feedback--${feedback.type}`}>
                {feedback.message}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={isSubmitting || !hasChanges}>
                {isSubmitting ? (
                  <>Saving...</>
                ) : (
                  <><FiSave /> Save changes</>
                )}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setFormState({
                    name: originalValues.name,
                    email: originalValues.email,
                    username: originalValues.username,
                  });
                  setNewAvatar(null);
                  setRemoveAvatar(false);
                  setPreviewUrl(originalValues.avatar);
                  setFeedback({ type: null, message: '' });
                }}
                disabled={!hasChanges}
              >
                <FiRefreshCw /> Reset
              </button>
            </div>
          </form>

          <div className="profile-history mt-8">
            <h2 className="text-xl font-bold mb-4">Your Thread History</h2>
            {isLoadingThreads ? (
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-gray-800/50 rounded-lg w-full"></div>
                <div className="h-16 bg-gray-800/50 rounded-lg w-full"></div>
                <div className="h-16 bg-gray-800/50 rounded-lg w-full"></div>
              </div>
            ) : userThreads.length > 0 ? (
              <div className="space-y-4">
                {userThreads.map(thread => (
                  <Link to={`/forum/threads/${thread.id}`} key={thread.id} className="block p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg text-white mb-1">{thread.title}</h3>
                        <p className="text-sm text-gray-400 line-clamp-2">{thread.summary || thread.body}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                        {new Date(thread.created_at || thread.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                      {thread.category && (
                        <span className="bg-white/10 px-2 py-1 rounded text-[var(--color-accent-secondary)]">
                          {thread.category.name}
                        </span>
                      )}
                      <span>{thread.counts?.likes || 0} Likes</span>
                      <span>{thread.counts?.replies || 0} Replies</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white/5 rounded-lg border border-white/5 border-dashed">
                <p className="text-gray-400 mb-4">You haven't posted any threads yet.</p>
                <Link to="/forum/create" className="primary-button inline-flex">
                  Start your first thread
                </Link>
              </div>
            )}
          </div>
        </div>

        <aside className="profile-preview">
          {/* ... (keep existing preview card) ... */}
          <div className="profile-preview__card">
            <div className="profile-preview__header">
              <span className="preview-label">Live Preview</span>
            </div>
            <div className="profile-preview__content">
              <div className="profile-preview__avatar">
                {previewImage ? (
                  <img src={previewImage} alt="Profile preview" />
                ) : (
                  <span>{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
                )}
              </div>
              <div className="profile-preview__info">
                <h3 className="profile-preview__name">{formState.name || 'Your name here'}</h3>
                <p className="profile-preview__handle">@{formState.username || 'username'}</p>
              </div>

              <div className="profile-preview__stats">
                <div className="stat-item">
                  <span className="stat-value">{user?._count?.threads ?? userThreads.length ?? '0'}</span>
                  <span className="stat-label">Threads</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{user?._count?.interactions ?? '0'}</span>
                  <span className="stat-label">Interactions</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ProfilePage;
