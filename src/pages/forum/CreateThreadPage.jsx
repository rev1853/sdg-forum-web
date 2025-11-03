import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '../../api';
import { useAuth } from '@/context/AuthContext';

const CreateThreadPage = () => {
  const { token } = useAuth();
  const { threads, categories: categoriesApi } = useApi();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const response = await categoriesApi.list();
        if (cancelled) return;
        const normalized = Array.isArray(response) ? response : [];
        setCategories(normalized);
        setLoadError('');
      } catch (caughtError) {
        if (!cancelled) {
          console.error('Failed to fetch categories', caughtError);
          setCategories([]);
          setLoadError('Categories are unavailable at the moment.');
        }
      }
    };

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, [categoriesApi]);

  useEffect(() => {
    if (!image) {
      setImagePreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(image);
    setImagePreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [image]);

  const handleImageChange = (event) => {
    setImage(event.target.files?.[0] ?? null);
  };

  const tagValues = useMemo(
    () =>
      tags
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    [tags],
  );

  const selectedCategory = useMemo(() => {
    if (!category) return null;
    return categories.find((entry) => String(entry?.id ?? entry?.value) === String(category)) ?? null;
  }, [categories, category]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('You need to be signed in to create a thread.');
      return;
    }

    if (!category) {
      setError('Pick a category before submitting.');
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      setError('Title and body are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: trimmedTitle,
        body: trimmedBody,
        categoryIds: [category],
        tags: tagValues.length > 0 ? tagValues : undefined,
        image: image ?? undefined,
      };

      const response = await threads.createThread(payload);
      const createdThread = response?.thread ?? response ?? null;
      const identifier = createdThread?.id ?? createdThread?.slug ?? null;

      if (identifier) {
        navigate(`/forum/threads/${identifier}`);
        return;
      }

      navigate('/forum/threads');
    } catch (caughtError) {
      console.error('Failed to create thread', caughtError);
      const message =
        caughtError?.data?.message ||
        caughtError?.data?.error ||
        caughtError?.message ||
        'Failed to create thread. Try again shortly.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewTitle = title.trim() || 'Thread title';
  const previewBody = (body || 'Use this space to share the context, what you tried, and what you need next.')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');
  const previewTags = tagValues.slice(0, 4);

  return (
    <>
      <ForumNavbar />
      <main className="forum-layout">
        <section className="form-hero">
          <span className="form-hero__eyebrow">Start a conversation</span>
          <h1>Share a field update with the community</h1>
          <p>Thread posts help practitioners learn from each other. Tell the story, include data points, and ask for what you need.</p>
        </section>

        <div className="create-thread">
          <form className="create-thread__form" onSubmit={handleSubmit}>
            {error && <div className="form-feedback form-feedback--error">{error}</div>}
            {loadError && <div className="form-feedback form-feedback--warning">{loadError}</div>}

            <div className="form-field">
              <label htmlFor="title">Thread title</label>
              <p className="form-field__hint">Summarize the essence of your update in one punchy sentence.</p>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Rainwater harvesting pilot doubled collection rates"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="body">What happened?</label>
              <p className="form-field__hint">
                Include what you tried, what surprised you, and how others can support next steps. Markdown and line breaks are supported.
              </p>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                placeholder="Set the scene, share your learning, and link to evidence or media."
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="category">Goal focus</label>
                <p className="form-field__hint">Pick the primary SDG focus for this update.</p>
                <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} required>
                  <option value="" disabled>Select a category</option>
                  {Array.isArray(categories) &&
                    categories
                      .map((cat) => {
                        const id = cat?.id ?? cat?.value ?? null;
                        const name = cat?.name ?? cat?.label ?? 'Untitled category';
                        return id ? (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ) : null;
                      })
                      .filter(Boolean)}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="tags">Tags</label>
                <p className="form-field__hint">Use up to five labels so others can find your update.</p>
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="water, co-design, pilot"
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="image">Cover image</label>
              <p className="form-field__hint">Optional: upload a hero image or infographic (max 5&nbsp;MB).</p>
              <input id="image" type="file" accept="image/*" onChange={handleImageChange} />
              {image && (
                <p className="form-field__meta">
                  Selected file: <strong>{image.name}</strong>
                </p>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Publish thread'}
              </button>
              <p className="form-actions__hint">
                Threads are public and can be edited later from your profile.
              </p>
            </div>
          </form>

          <aside className="create-thread__sidebar">
            <div className="preview-card">
              <header className="preview-card__header">
                <span className="preview-card__badge">{selectedCategory?.name ?? 'Goal TBD'}</span>
                <h3>{previewTitle}</h3>
                <p>{previewBody}</p>
              </header>
              {imagePreview && (
                <div className="preview-card__media">
                  <img src={imagePreview} alt="" />
                </div>
              )}
              {previewTags.length > 0 && (
                <footer className="preview-card__tags">
                  {previewTags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </footer>
              )}
            </div>

            <div className="create-thread__tips">
              <h4>Tips for a standout thread</h4>
              <ul>
                <li>Share the challenge, what you tested, and the outcome.</li>
                <li>Link to reports, dashboards, or media where possible.</li>
                <li>End with a clear ask—feedback, partners, or resources.</li>
                <li>Mention collaborators to give credit and invite them in.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
};

export default CreateThreadPage;
