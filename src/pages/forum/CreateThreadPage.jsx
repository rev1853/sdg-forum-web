import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForumNavbar from '../../components/forum/ForumNavbar';
import { useApi } from '@/api';
import { useAuth } from '@/context/AuthContext';

const MAX_CATEGORIES = 3;

const CreateThreadPage = () => {
  const navigate = useNavigate();
  const { threads, categories } = useApi();
  const { token } = useAuth();

  const [title, setTitle] = useState('');
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [summary, setSummary] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [tags, setTags] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [goalError, setGoalError] = useState('');
  const [categoryOptions, setCategoryOptions] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    categories
      .list()
      .then((list) => {
        if (cancelled) return;
        const options = list
          .filter((category) => Boolean(category?.id))
          .map((category) => ({
            value: category.id,
            label:
              category.sdg_number !== undefined && category.sdg_number !== null
                ? `Goal ${String(category.sdg_number).padStart(2, '0')} - ${category.name}`
                : category.name ?? 'Untitled goal',
          }));
        setCategoryOptions(options);
        if (options.length > 0 && selectedGoals.length === 0) {
          setSelectedGoals([options[0].value]);
        }
      })
      .catch((error) => {
        console.error('Failed to load categories', error);
        if (!cancelled) {
          setCategoryOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [categories, selectedGoals.length]);

  useEffect(() => {
    const nonEmpty = selectedGoals.filter(Boolean);
    if (nonEmpty.length === 0) {
      setGoalError('Pick at least one category so the right teams can find your thread.');
    } else if (nonEmpty.length > MAX_CATEGORIES) {
      setGoalError(`You can assign up to ${MAX_CATEGORIES} categories.`);
    } else {
      setGoalError('');
    }
  }, [selectedGoals]);

  const tagTokens = useMemo(
    () =>
      tags
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean),
    [tags],
  );

  const selectedGoalObjects = useMemo(
    () =>
      selectedGoals
        .map((goalValue) => categoryOptions.find((option) => option.value === goalValue))
        .filter(Boolean),
    [selectedGoals, categoryOptions],
  );

  const handleGoalChange = (index, value) => {
    setSelectedGoals((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addGoal = () => {
    const filledCount = selectedGoals.filter(Boolean).length;
    if (filledCount >= MAX_CATEGORIES || selectedGoals.length >= MAX_CATEGORIES) {
      setGoalError(`You can assign up to ${MAX_CATEGORIES} categories.`);
      return;
    }
    setSelectedGoals((prev) => [...prev, '']);
  };

  const removeGoal = (index) => {
    setSelectedGoals((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [''] : next;
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
  };

  const validateGoals = () => {
    const nonEmpty = selectedGoals.filter(Boolean);
    if (nonEmpty.length === 0) {
      setGoalError('Pick at least one category so the right teams can find your thread.');
      return false;
    }
    if (nonEmpty.length > MAX_CATEGORIES) {
      setGoalError(`You can assign up to ${MAX_CATEGORIES} categories.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setFeedback({ type: 'error', message: 'Please sign in to publish a new thread.' });
      return;
    }

    if (!validateGoals()) {
      return;
    }

    const nonEmptyGoals = selectedGoals.filter(Boolean);
    if (!title.trim() || !summary.trim()) {
      setFeedback({ type: 'error', message: 'Title and summary are required.' });
      return;
    }

    const combinedBody = [summary.trim(), callToAction.trim() ? `\n\nCall to action:\n${callToAction.trim()}` : '']
      .join('')
      .trim();

    try {
      setIsSubmitting(true);
      setFeedback({ type: null, message: '' });

      await threads.createThread({
        title: title.trim(),
        body: combinedBody || summary.trim(),
        categoryIds: nonEmptyGoals,
        tags: tagTokens,
        image: imageFile ?? undefined,
      });

      setFeedback({
        type: 'success',
        message: 'Thread published successfully. Redirecting you back to the forum…',
      });

      setTimeout(() => {
        navigate('/forum/threads');
      }, 1200);
    } catch (error) {
      console.error('Failed to create thread', error);
      const errorMessage =
        error?.data?.message ||
        error?.data?.error ||
        error?.message ||
        'Something went wrong while publishing your thread.';
      setFeedback({ type: 'error', message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="themed-page forum-page">
      <title>Create Thread • SDG Forum</title>
      <ForumNavbar />

      <div className="create-thread">
        <form className="thread-form" onSubmit={handleSubmit}>
          <span className="badge">Thread basics</span>
          <h1>Share your latest impact</h1>
          <p>
            Give your peers the context they need to jump in quickly. A clear title and summary help the right people find
            you.
          </p>

          <div className="form-group">
            <label htmlFor="thread-title">Thread title</label>
            <input
              id="thread-title"
              placeholder="Summarize the challenge or progress in one line"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>SDG categories</label>
              <small className="form-helper">Choose up to three categories so peers can find your thread fast.</small>
              <div className="goal-select-group">
                {selectedGoals.map((value, index) => (
                  <div key={index} className="goal-select">
                    <select
                      value={value}
                      onChange={(event) => handleGoalChange(index, event.target.value)}
                    >
                      <option value="">Select a goal</option>
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {index > 0 && (
                      <button
                        type="button"
                        className="goal-remove-btn"
                        onClick={() => removeGoal(index)}
                        aria-label="Remove category"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {selectedGoals.length < MAX_CATEGORIES && (
                <button type="button" className="goal-add-btn" onClick={addGoal}>
                  + Add another category
                </button>
              )}
              {goalError && <small className="form-error">{goalError}</small>}
            </div>

            <div className="form-group">
              <label htmlFor="thread-tags">Tags</label>
              <input
                id="thread-tags"
                placeholder="water, sensors, climate adaptation"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
              />
              <small>Separate tags with commas to improve discovery.</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="thread-summary">Summary</label>
            <textarea
              id="thread-summary"
              rows={4}
              placeholder="Explain where you are in the journey, what you have tried, and what you have learned so far."
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="thread-action">Call to action</label>
            <textarea
              id="thread-action"
              rows={3}
              placeholder="What do you need from the community right now? Samples, expertise, partners, funding?"
              value={callToAction}
              onChange={(event) => setCallToAction(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="thread-image">Cover image (optional)</label>
            <input id="thread-image" type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          {feedback.type === 'error' ? <span className="form-error">{feedback.message}</span> : null}
          {feedback.type === 'success' ? (
            <div className="auth-success">
              <p>{feedback.message}</p>
            </div>
          ) : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Publishing…' : 'Publish thread'}
          </button>
        </form>

        <aside className="thread-preview">
          <div className="preview-card">
            <h2>Live preview</h2>
            <div className="preview-body">
              <div className="preview-goals">
                {selectedGoalObjects.length > 0 ? (
                  selectedGoalObjects.map((goal) => (
                    <span key={goal.value} className="thread-card__goal">
                      {goal.label}
                    </span>
                  ))
                ) : (
                  <span className="preview-placeholder">Pick at least one goal to help others discover your thread.</span>
                )}
              </div>

              <h3>{title || 'Thread title goes here'}</h3>
              <p>{summary || 'Your summary will appear here as you type.'}</p>

              {callToAction ? (
                <div className="preview-cta">
                  <strong>Call to action</strong>
                  <p>{callToAction}</p>
                </div>
              ) : null}

              {tagTokens.length > 0 ? (
                <div className="preview-tags">
                  {tagTokens.map((tag) => (
                    <span key={tag} className="preview-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default CreateThreadPage;
