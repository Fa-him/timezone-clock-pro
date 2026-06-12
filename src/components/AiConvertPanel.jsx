import { useState } from 'react';
import { Bot, CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import { convertPromptToUserTime } from '../lib/time.js';

export default function AiConvertPanel({ open, onClose }) {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    if (!open) return null;

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setResult(null);

        if (!prompt.trim()) {
            setError('Please enter a time prompt first.');
            return;
        }

        try {
            setLoading(true);
            const converted = await convertPromptToUserTime(prompt.trim());
            setResult(converted);
        } catch (err) {
            setError(err.message || 'Something went wrong while converting the time.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="AI time converter">
            <div className="ai-panel">
                <button className="icon-button panel-close" type="button" onClick={onClose} aria-label="Close AI Convert">
                    <X size={20} />
                </button>

                <div className="ai-panel-header">
                    <div className="ai-badge">
                        <Bot size={22} />
                    </div>
                    <div>
                        <p className="eyebrow">Smart prompt converter</p>
                        <h2>AI Convert</h2>
                    </div>
                </div>

                <p className="panel-copy">
                    Type a sentence with a time and source time zone. Your browser time zone will be used as the target.
                </p>

                <form className="ai-form" onSubmit={handleSubmit}>
                    <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="enter any time with time zone or give a prompt for time!"
                        rows={4}
                    />
                    <button className="primary-button" type="submit" disabled={loading}>
                        {loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                        {loading ? 'Converting...' : 'Enter'}
                    </button>
                </form>

                {loading && (
                    <div className="loading-card">
                        <div className="loader-orbit" />
                        <p>Reading your prompt and converting the time...</p>
                    </div>
                )}

                {error && <div className="error-card">{error}</div>}

                {result && (
                    <div className="result-card">
                        <div className="result-title">
                            <CheckCircle2 size={20} />
                            Converted successfully
                        </div>

                        <div className="conversion-grid">
                            <div>
                                <span>From</span>
                                <strong>{result.source.formatted}</strong>
                                <small>{result.source.label}</small>
                            </div>
                            <div>
                                <span>Your time</span>
                                <strong>{result.target.formatted}</strong>
                                <small>{result.target.label}</small>
                            </div>
                        </div>
                    </div>
                )}

                <div className="examples">
                    <span>Try:</span>
                    <button type="button" onClick={() => setPrompt('Monday June 8 7:00 PM Eastern')}>
                        Monday June 8 7:00 PM Eastern
                    </button>
                    <button type="button" onClick={() => setPrompt('tomorrow 10am Tokyo')}>
                        tomorrow 10am Tokyo
                    </button>
                </div>
            </div>
        </div>
    );
}
