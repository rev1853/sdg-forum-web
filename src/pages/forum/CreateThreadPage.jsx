import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiType, FiAlignLeft, FiImage, FiTag, FiLayers, FiCheck, FiChevronDown, FiX } from 'react-icons/fi';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '../../api';
import { useAuth } from '@/context/AuthContext';

const CreateThreadPage = () => {
  const { token } = useAuth();
  const { threads, categories: categoriesApi } = useApi();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [tags, setTags] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleCategoryToggle = (id) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories((prev) => prev.filter((c) => c !== id));
    } else {
      if (selectedCategories.length < 3) {
        setSelectedCategories((prev) => [...prev, id]);
      }
    }
  };

  const removeCategory = (e, id) => {
    e.stopPropagation();
    setSelectedCategories((prev) => prev.filter((c) => c !== id));
  };

  const tagValues = useMemo(
    () =>
      tags
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    [tags],
  );

  const selectedCategoryObjects = useMemo(() => {
    return categories.filter((cat) => selectedCategories.includes(cat.id || cat.value));
  }, [categories, selectedCategories]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('You need to be signed in to create a thread.');
      return;
    }

    // Filter out any undefined/null values just in case
    const validCategoryIds = selectedCategories.filter(Boolean);

    if (validCategoryIds.length === 0) {
      setError('Pick at least one category before submitting.');
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
        categoryIds: validCategoryIds,
        tags: tagValues.length > 0 ? tagValues : undefined,
        image: image ?? undefined,
      };

      console.log('Submitting thread payload:', payload);

      const response = await threads.createThread(payload);
      console.log('Thread created response:', response);

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
      if (window.location.pathname.includes('/create')) {
        setIsSubmitting(false);
      }
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
              <label htmlFor="title">
                <FiType className="form-icon" /> Thread title
              </label>
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
              <label htmlFor="body">
                <FiAlignLeft className="form-icon" /> What happened?
              </label>
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
              <div className="form-field" ref={dropdownRef}>
                <label>
                  <FiLayers className="form-icon" /> Goal focus
                </label>
                <p className="form-field__hint">Pick up to 3 primary SDG focuses.</p>

                <div
                  className={`custom-select ${isDropdownOpen ? 'is-open' : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="custom-select__trigger">
                    {selectedCategories.length > 0 ? (
                      <div className="selected-tags">
                        {selectedCategoryObjects.map(cat => (
                          <span key={cat.id || cat.value} className="select-tag">
                            {cat.name || cat.label}
                            <button
                              type="button"
                              onClick={(e) => removeCategory(e, cat.id || cat.value)}
                              className="select-tag__remove"
                            >
                              <FiX size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="placeholder">Select categories...</span>
                    )}
                    <FiChevronDown className="chevron" />
                  </div>

                  {isDropdownOpen && (
                    <div className="custom-select__options">
                      {categories.map((cat) => {
                        const id = cat.id || cat.value;
                        const isSelected = selectedCategories.includes(id);
                        const isDisabled = !isSelected && selectedCategories.length >= 3;

                        return (
                          <div
                            key={id}
                            className={`select-option ${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isDisabled) handleCategoryToggle(id);
                            }}
                          >
                            <span>{cat.name || cat.label}</span>
                            {isSelected && <FiCheck className="check-icon" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="tags">
                  <FiTag className="form-icon" /> Tags
                </label>
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
              <label>
                <FiImage className="form-icon" /> Cover image
              </label>
              <p className="form-field__hint">Optional: upload a hero image or infographic (max 5&nbsp;MB).</p>

              <div className="file-upload-wrapper">
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-upload-input"
                />
                <div className="file-upload-control">
                  <FiImage size={24} />
                  <span>{image ? image.name : 'Click to upload or drag and drop'}</span>
                </div>
              </div>
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
                <span className="preview-card__badge">{selectedCategoryObjects[0]?.name ?? 'Goal TBD'}</span>
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
