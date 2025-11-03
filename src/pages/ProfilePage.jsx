import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { resolveProfileImageUrl } from '@utils/media';
import ForumNavbar from '../components/forum/ForumNavbar';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const ProfilePage = () => {
  const { users, baseUrl } = useApi();
  const { user, token, refreshUser } = useAuth();

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    username: '',
  });
  const [newAvatar, setNewAvatar] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

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
    if (!user) return;
    setFormState({
      name: user.name ?? '',
      email: user.email ?? '',
      username: user.username ?? '',
    });
    setPreviewUrl(resolveProfileImageUrl(user, baseUrl));
    setRemoveAvatar(false);
    setNewAvatar(null);
  }, [user, baseUrl]);

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
          <h1>Profile settings</h1>
          <p>You need to be signed in to manage your profile.</p>
          <Link to="/auth/login" className="primary-button">
            Sign in to continue
          </Link>
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
            <div className="profile-form__row">
              <div className="form-group">
                <label htmlFor="profile-name">Full name</label>
                <input
                  id="profile-name"
                  name="name"
                  placeholder="How should we address you?"
                  value={formState.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="profile-username">Username</label>
                <input
                  id="profile-username"
                  name="username"
                  placeholder="Pick a unique handle"
                  value={formState.username}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="profile-email">Email</label>
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

            <div className="profile-form__avatar form-group">
              <label htmlFor="profile-avatar">Profile picture</label>
              <div className="profile-avatar-inputs">
                <input id="profile-avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
                <button type="button" className="ghost-button" onClick={handleRemoveAvatar}>
                  Remove picture
                </button>
              </div>
              <small className="form-helper">PNG or JPG up to 2MB.</small>
            </div>

            {feedback.type === 'error' ? <span className="form-error">{feedback.message}</span> : null}
            {feedback.type === 'success' ? (
              <div className="auth-success">
                <p>{feedback.message}</p>
              </div>
            ) : null}
            {feedback.type === 'info' ? <div className="form-helper">{feedback.message}</div> : null}

            <div className="profile-actions">
              <button type="submit" className="primary-button" disabled={isSubmitting || !hasChanges}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
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
              >
                Reset
              </button>
            </div>
          </form>

          <aside className="profile-preview">
            <div className="profile-preview__card">
              <div className="profile-preview__heading">
                <h2>Live preview</h2>
                <p>See how your profile appears to other members.</p>
              </div>
              <div className="profile-preview__avatar">
                {previewImage ? (
                  <img src={previewImage} alt="Profile preview" />
                ) : (
                  <span>{user?.name?.[0]?.toUpperCase() ?? 'U'}</span>
                )}
              </div>
              <div className="profile-preview__details">
                <span className="profile-preview__name">{formState.name || 'Your name here'}</span>
                <span className="profile-preview__meta">@{formState.username || 'username'}</span>
                <span className="profile-preview__meta">{formState.email || 'name@example.com'}</span>
              </div>
              <div className="profile-preview__stats">
                <div className="profile-preview__stat">
                  <strong>{user?._count?.threads ?? '—'}</strong>
                  <span>Threads</span>
                </div>
                <div className="profile-preview__stat">
                  <strong>{user?._count?.interactions ?? '—'}</strong>
                  <span>Interactions</span>
                </div>
                <div className="profile-preview__stat">
                  <strong>{user?._count?.reportsFiled ?? '—'}</strong>
                  <span>Reports filed</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
