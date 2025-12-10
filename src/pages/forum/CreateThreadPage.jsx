import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiType, FiAlignLeft, FiImage, FiTag, FiLayers, FiCheck, FiChevronDown, FiX, FiInfo, FiUploadCloud, FiTrash2 } from 'react-icons/fi';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '../../api';
import { useAuth } from '@/context/AuthContext';

const CreateThreadPage = () => {
  const { token, user } = useAuth();
  const { threads, categories: categoriesApi } = useApi();
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [tags, setTags] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // UI State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Data State
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState(null);



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
    const file = event.target.files?.[0];
    if (file) setImage(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
    setReviewFeedback(null);

    if (!token) {
      setError('You need to be signed in to create a thread.');
      return;
    }

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
      const reviewStatus = caughtError?.data?.status ?? caughtError?.data?.details?.status;
      const reviewScore = caughtError?.data?.details?.score ?? caughtError?.data?.review_score ?? caughtError?.data?.score;
      const reviewText = caughtError?.data?.details?.review_text ?? caughtError?.data?.review_text;

      if (reviewStatus === 'REVIEW_FAILED') {
        setReviewFeedback({
          status: reviewStatus,
          score: reviewScore,
          text: reviewText,
        });
        const baseMessage =
          caughtError?.data?.error ||
          caughtError?.data?.message ||
          'Your draft did not pass the relevance review. Please adjust your content and try again.';
        setError(baseMessage);
      } else {
        const message =
          caughtError?.data?.message ||
          caughtError?.data?.error ||
          caughtError?.message ||
          'Failed to create thread. Try again shortly.';
        setError(message);
      }
    } finally {
      if (window.location.pathname.includes('/create')) {
        setIsSubmitting(false);
      }
    }
  };

  const previewTitle = title.trim() || 'Your Thread Title';
  const previewBody = (body || 'This is where your content preview will appear. Start typing to see how your post will look to others.')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');
  const previewTags = tagValues.slice(0, 4);

  return (
    <>
      <ForumNavbar />
      <main className="forum-layout">
        <header className="create-thread-header">
          <div className="create-thread-header__content">
            <span className="create-thread-header__eyebrow">Start a conversation</span>
            <h1>Create New Thread</h1>
            <p>Share your insights, ask questions, or discuss SDG goals with the community.</p>
          </div>
        </header>

        <div className="create-thread">
          <form className="create-thread__form" onSubmit={handleSubmit}>
            {error && (
              <div className="form-feedback form-feedback--error">
                <FiInfo /> {error}
              </div>
            )}
            {reviewFeedback && user?.id && (
              <div className="form-feedback form-feedback--warning">
                <FiInfo />
                <div>
                  <strong>Review feedback</strong>
                  <p className="mt-1">
                    {typeof reviewFeedback.score === 'number' ? (
                      <>Score: <span className="font-semibold">{reviewFeedback.score}</span></>
                    ) : (
                      'Score: unavailable'
                    )}
                  </p>
                  {reviewFeedback.text ? <p className="mt-1 text-sm">{reviewFeedback.text}</p> : null}
                  <p className="mt-1 text-sm text-white/80">
                    Align your draft more closely with the selected SDG categories before resubmitting.
                  </p>
                </div>
              </div>
            )}
            {loadError && (
              <div className="form-feedback form-feedback--warning">
                <FiInfo /> {loadError}
              </div>
            )}

            <div className="form-section">
              <div className="form-field">
                <label htmlFor="title">
                  <FiType className="form-icon" /> Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  className="form-input--large"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="body">
                  <FiAlignLeft className="form-icon" /> Content
                </label>
                <div className="textarea-wrapper">
                  <textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={12}
                    placeholder="Share your thoughts... (Markdown supported)"
                    required
                  />
                  <div className="textarea-footer">
                    <span>Markdown supported</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field" ref={dropdownRef}>
                <label>
                  <FiLayers className="form-icon" /> Related Goals
                </label>
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
                      <span className="placeholder">Select up to 3 goals...</span>
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
                <p className="form-field__hint">Select the SDG goals this thread relates to.</p>
              </div>

              <div className="form-field">
                <label htmlFor="tags">
                  <FiTag className="form-icon" /> Tags
                </label>
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. climate, innovation, policy (comma separated)"
                />
                <p className="form-field__hint">Add keywords to help others find your thread.</p>
              </div>
            </div>

            <div className="form-field">
              <label>
                <FiImage className="form-icon" /> Cover Image
              </label>
              <div
                className={`file-upload-wrapper ${isDragging ? 'is-dragging' : ''} ${image ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-upload-input"
                />
                <div className="file-upload-control">
                  {imagePreview ? (
                    <div className="file-preview">
                      <img src={imagePreview} alt="Preview" />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={handleRemoveImage}
                        title="Remove image"
                      >
                        <FiTrash2 />
                      </button>
                      <div className="file-preview__overlay">
                        <FiUploadCloud size={24} />
                        <span>Change Image</span>
                      </div>
                    </div>
                  ) : (
                    <div className="file-placeholder">
                      <div className="icon-circle">
                        <FiUploadCloud size={24} />
                      </div>
                      <span className="primary-text">Click to upload or drag and drop</span>
                      <span className="secondary-text">SVG, PNG, JPG or GIF (max. 5MB)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Publishing...' : 'Publish Thread'}
              </button>
            </div>
          </form>

          <aside className="create-thread__sidebar">
            <div className="sidebar-sticky">
              <div className="preview-label">Live Preview</div>
              <div className="thread-card preview-card">
                {imagePreview && (
                  <div className="thread-card__media">
                    <img src={imagePreview} alt="" />
                  </div>
                )}
                <div className="thread-card__content">
                  <div className="thread-card__meta">
                    <span className="thread-card__goal">
                      {selectedCategoryObjects[0]?.name ?? 'Goal'}
                    </span>
                    <span className="thread-card__date">Just now</span>
                  </div>

                  <h3 className="thread-card__title">{previewTitle}</h3>
                  <p className="thread-card__snippet">{previewBody}</p>

                  {previewTags.length > 0 && (
                    <div className="thread-card__tags">
                      {previewTags.map((tag) => (
                        <span key={tag} className="thread-tag">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="thread-card__footer">
                    <div className="thread-card__author">
                      <div className="thread-card__author-avatar" style={{ background: 'var(--color-accent-primary)' }}></div>
                      <div className="thread-card__author-meta">
                        <span>You</span>
                        <small>Author</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="create-thread__tips">
                <h4><FiInfo /> Posting Tips</h4>
                <ul>
                  <li><strong>Be specific:</strong> Clear titles help people find your topic.</li>
                  <li><strong>Add context:</strong> Explain why this matters to the SDG goals.</li>
                  <li><strong>Use tags:</strong> Relevant tags increase visibility.</li>
                  <li><strong>Be respectful:</strong> Keep the discussion constructive.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
};

export default CreateThreadPage;
