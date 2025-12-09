import { useState, useEffect } from 'react';
import { FiX, FiType, FiAlignLeft } from 'react-icons/fi';
import { useApi } from '../../api';

const EditThreadModal = ({ isOpen, onClose, thread, onUpdate }) => {
    const { threads } = useApi();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (thread) {
            setTitle(thread.title || '');
            setBody(thread.body || '');
        }
    }, [thread]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const payload = {
                title: title.trim(),
                body: body.trim(),
            };

            const response = await threads.updateThread(thread.id, payload);
            const updatedThread = response?.thread ?? response;

            onUpdate(updatedThread);
            onClose();
        } catch (err) {
            console.error('Failed to update thread', err);
            setError(err?.message || 'Failed to update thread. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="thread-report-modal">
            <div className="thread-report-modal__overlay" onClick={onClose} />
            <div className="thread-report-modal__dialog" role="dialog" aria-modal="true">
                <form onSubmit={handleSubmit} className="thread-report-modal__form">
                    <header className="thread-report-modal__header">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Edit Thread</h2>
                            <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FiX size={20} />
                            </button>
                        </div>
                    </header>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4 my-4">
                        <div className="form-field">
                            <label htmlFor="edit-title" className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]">
                                <div className="flex items-center gap-2">
                                    <FiType /> Title
                                </div>
                            </label>
                            <input
                                id="edit-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] rounded-lg px-4 py-2 text-white focus:border-[var(--color-accent-primary)] outline-none transition-colors"
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="edit-body" className="block text-sm font-medium mb-1 text-[var(--color-text-secondary)]">
                                <div className="flex items-center gap-2">
                                    <FiAlignLeft /> Content
                                </div>
                            </label>
                            <textarea
                                id="edit-body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={8}
                                className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] rounded-lg px-4 py-2 text-white focus:border-[var(--color-accent-primary)] outline-none transition-colors resize-y"
                                required
                            />
                        </div>
                    </div>

                    <div className="thread-report-modal__actions">
                        <button
                            type="button"
                            className="thread-report-modal__cancel"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="thread-report-modal__submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditThreadModal;
