import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { resolveProfileImageUrl } from '@utils/media';
import ForumNavbar from '../components/forum/ForumNavbar';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiMail, FiAtSign, FiCamera, FiTrash2, FiRefreshCw, FiSave, FiShield, FiSettings, FiClock, FiMessageSquare, FiHeart } from 'react-icons/fi';

const ProfilePage = () => {
  const { users, baseUrl } = useApi();
  const { user, token, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

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
      if (current.name === '' && current.email === '' && current.username === '') {
        return {
          name: user.name ?? '',
          email: user.email ?? '',
          username: user.username ?? '',
        };
      }
      return current;
    });

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
    if (window.confirm('Are you sure you want to remove your profile picture?')) {
      setNewAvatar(null);
      setRemoveAvatar(true);
      setPreviewUrl(null);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
          {/* Left Sidebar: Profile Card */}
          <aside className="profile-sidebar">
            <div className="profile-card">
              <div className="profile-card__avatar-wrapper">
                <div className="profile-card__avatar">
                  {previewImage ? (
                    <img src={previewImage} alt="Profile" />
                  ) : (
                    <span className="profile-card__avatar-fallback">{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="profile-card__edit-btn"
                  onClick={triggerFileInput}
                  title="Change profile picture"
                >
                  <FiCamera size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  style={{ display: 'none' }}
                />
              </div>

              <div className="profile-card__info">
                <h2>{formState.name || 'Your Name'}</h2>
                <p>@{formState.username || 'username'}</p>
              </div>

              <div className="profile-card__stats">
                <div className="stat-item">
                  <span className="stat-value">{user?._count?.threads ?? userThreads.length ?? '0'}</span>
                  <span className="stat-label">Threads</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{user?._count?.interactions ?? '0'}</span>
                  <span className="stat-label">Interactions</span>
                </div>
              </div>

              {previewImage && (
                <button
                  type="button"
                  className="text-button text-red-400 hover:text-red-300 mt-6 text-sm flex items-center gap-2"
                  onClick={handleRemoveAvatar}
                >
                  <FiTrash2 size={14} /> Remove picture
                </button>
              )}
            </div>
          </aside>

          {/* Right Content: Settings & History */}
          <div className="profile-content">

            {/* Settings Section */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">
                  <FiSettings className="profile-section__icon" /> Account Details
                </h2>
              </div>

              <form className="profile-form-fields" onSubmit={handleSubmit}>
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

                {feedback.message && (
                  <div className={`form-feedback form-feedback--${feedback.type} mt-4`}>
                    {feedback.message}
                  </div>
                )}

                <div className="form-actions mt-6">
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
            </section>

            {/* History Section */}
            <section className="profile-section">
              <div className="profile-section__header">
                <h2 className="profile-section__title">
                  <FiClock className="profile-section__icon" /> Thread History
                </h2>
              </div>

              <div className="thread-history-list">
                {isLoadingThreads ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-24 bg-white/5 rounded-xl w-full"></div>
                    <div className="h-24 bg-white/5 rounded-xl w-full"></div>
                  </div>
                ) : userThreads.length > 0 ? (
                  userThreads.map(thread => (
                    <Link to={`/forum/threads/${thread.id}`} key={thread.id} className="thread-history-item">
                      <div className="thread-history-item__header">
                        <h3 className="thread-history-item__title">{thread.title}</h3>
                      </div>
                      <p className="thread-history-item__summary">{thread.summary || thread.body}</p>
                      <div className="thread-history-item__meta">
                        {thread.category && (
                          <span className="thread-history-item__category">
                            {thread.category.name}
                          </span>
                        )}
                        <span className="thread-history-item__stat">
                          <FiHeart size={14} /> {thread.counts?.likes || 0}
                        </span>
                        <span className="thread-history-item__stat">
                          <FiMessageSquare size={14} /> {thread.counts?.replies || 0}
                        </span>
                        <span className="thread-history-item__date">
                          {new Date(thread.created_at || thread.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">You haven't posted any threads yet.</p>
                    <Link to="/forum/create" className="primary-button inline-flex">
                      Start your first thread
                    </Link>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
