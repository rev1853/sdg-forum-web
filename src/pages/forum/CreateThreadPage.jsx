import { useEffect, useMemo, useState } from 'react';
import ForumNavbar from '../../components/forum/ForumNavbar';
import sdgGoals from '../../data/sdgGoals';

const goalOptions = sdgGoals.map(goal => ({
  value: goal.forumCategory,
  label: `Goal ${goal.number.toString().padStart(3, '0')} - ${goal.title}`
}));

const CreateThreadPage = () => {
  const [title, setTitle] = useState('');
  const [selectedGoals, setSelectedGoals] = useState(() => [goalOptions[0]?.value ?? '']);
  const [summary, setSummary] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [tags, setTags] = useState('');
  const [goalError, setGoalError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const tagTokens = useMemo(
    () =>
      tags
        .split(',')
        .map(token => token.trim())
        .filter(Boolean),
    [tags]
  );

  const selectedGoalObjects = useMemo(() => selectedGoals
    .map(goalValue => goalOptions.find(option => option.value === goalValue))
    .filter(Boolean), [selectedGoals]);

  const handleGoalChange = (index, value) => {
    setSelectedGoals(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addGoal = () => {
    const filledCount = selectedGoals.filter(Boolean).length;
    if (filledCount >= 3 || selectedGoals.length >= 3) {
      setGoalError('You can assign up to three categories.');
      return;
    }
    setSelectedGoals(prev => [...prev, '']);
  };

  const removeGoal = index => {
    setSelectedGoals(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [''] : next;
    });
  };

  useEffect(() => {
    const nonEmpty = selectedGoals.filter(Boolean);
    if (nonEmpty.length === 0) {
      setGoalError('Pick at least one category so the right teams can find your thread.');
    } else if (nonEmpty.length > 3) {
      setGoalError('You can assign up to three categories.');
    } else {
      setGoalError('');
    }
  }, [selectedGoals]);

  const validateGoals = () => {
    const nonEmpty = selectedGoals.filter(Boolean);
    if (nonEmpty.length === 0) {
      setGoalError('Pick at least one category so the right teams can find your thread.');
      return false;
    }
    if (nonEmpty.length > 3) {
      setGoalError('You can assign up to three categories.');
      return false;
    }
    return true;
  };

  return (
    <section className="themed-page forum-page">
      <title>Create Thread • SDG Forum</title>
      <ForumNavbar />

      <div className="create-thread">
        <form
          className="thread-form"
          onSubmit={event => {
            event.preventDefault();
            validateGoals();
          }}
        >
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
              onChange={event => setTitle(event.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>SDG categories</label>
              <small className="form-helper">Choose up to three categories (two is perfect) so peers can find your thread fast.</small>
              <div className="goal-select-group">
                {selectedGoals.map((value, index) => (
                  <div key={index} className="goal-select">
                    <select
                      value={value}
                      onChange={event => handleGoalChange(index, event.target.value)}
                    >
                      <option value="">Select a goal</option>
                      {goalOptions.map(option => (
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
              {selectedGoals.length < 3 && (
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
                onChange={event => setTags(event.target.value)}
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
              onChange={event => setSummary(event.target.value)}
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
              onChange={event => setCallToAction(event.target.value)}
            />
          </div>

          <button type="submit" className="primary-button">
            Publish thread
          </button>
        </form>

        <aside className="thread-preview">
          <div className="preview-card">
            <h2>Live preview</h2>
            <div className="preview-body">
              <div className="preview-goals">
                {selectedGoalObjects.length > 0 ? (
                  selectedGoalObjects.map(goal => (
                    <span key={goal.value} className="thread-card__goal">
                      {goal.label}
                    </span>
                  ))
                ) : (
                  <span className="preview-placeholder">Pick up to three SDG categories.</span>
                )}
              </div>
              <h3>{title || 'Your thread title will appear here'}</h3>
              <p>{summary || 'Use the summary to orient peers in a few sentences and describe the current state of your project.'}</p>

              {tagTokens.length > 0 && (
                <div className="tag-pills">
                  {tagTokens.map(tag => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {callToAction && (
                <div className="preview-action">
                  <strong>What we need next</strong>
                  <p>{callToAction}</p>
                </div>
              )}
            </div>
          </div>

          <div className="preview-guidelines">
            <h3>Thread tips</h3>
            <ul>
              <li>Focus on one clear challenge or milestone per thread.</li>
              <li>Share metrics or outcomes when possible to help peers benchmark.</li>
              <li>Link to supporting documents and resources once the thread is published.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default CreateThreadPage;
