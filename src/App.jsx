import { useEffect, useMemo, useState } from 'react';
import { Bot, Globe2, MapPin, Search, Sparkles } from 'lucide-react';
import AiConvertPanel from './components/AiConvertPanel.jsx';
import ClockFace from './components/ClockFace.jsx';
import { getUserTimeZone, resolveTimeZone } from './lib/time.js';

function App() {
    const [query, setQuery] = useState('');
    const [zone, setZone] = useState(null);
    const [error, setError] = useState('');
    const [now, setNow] = useState(() => new Date());
    const [aiOpen, setAiOpen] = useState(false);

    const userZoneName = useMemo(() => getUserTimeZone(), []);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const local = resolveTimeZone(userZoneName);
        if (local) setZone(local);
    }, [userZoneName]);

    function handleSubmit(event) {
        event.preventDefault();
        const trimmed = query.trim();

        if (!trimmed) {
            setError('Please enter a city, country, or time zone name.');
            return;
        }

        const resolved = resolveTimeZone(trimmed);
        if (!resolved) {
            setError('I could not find that place. Try “Bangladesh”, “Dhaka”, “New York”, “London”, or “Asia/Dhaka”.');
            return;
        }

        setZone(resolved);
        setError('');
    }

    function chooseAlternative(timeZoneName) {
        const resolved = resolveTimeZone(timeZoneName);
        if (resolved) {
            setZone(resolved);
            setQuery(resolved.label);
            setError('');
        }
    }

    return (
        <main className="app-shell">
            <div className="aurora aurora-one" />
            <div className="aurora aurora-two" />
            <div className="noise" />

            <header className="top-bar">
                <div className="brand">
                    <div className="brand-icon">
                        <Globe2 size={22} />
                    </div>
                    <div>
                        <span>TimeSphere</span>
                        <small>World Clock</small>
                    </div>
                </div>

                <form className="search-card" onSubmit={handleSubmit}>
                    <MapPin size={18} />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Enter country, city, or time zone..."
                        aria-label="Country, city, or time zone"
                    />
                    <button type="submit" aria-label="Show clock">
                        <Search size={18} />
                        <span>Enter</span>
                    </button>
                </form>
            </header>

            <section className={zone ? 'hero has-clock' : 'hero'}>
                {!zone ? (
                    <div className="welcome-card">
                        <div className="hero-icon">
                            <Sparkles size={32} />
                        </div>
                        <p className="eyebrow">Beautiful global time</p>
                        <h1>Search a country or city to see its live clock.</h1>
                        <p>
                            Type something like <strong>Bangladesh</strong>, <strong>Dhaka</strong>, <strong>London</strong>,
                            <strong> Tokyo</strong>, or <strong>America/New_York</strong>.
                        </p>
                    </div>
                ) : (
                    <ClockFace date={now} zone={zone} />
                )}
            </section>

            {error && <div className="toast-error">{error}</div>}

            {zone?.alternatives?.length > 1 && (
                <div className="suggestions">
                    <span>Other zones in this country:</span>
                    {zone.alternatives.map((item) => (
                        <button key={item.name} type="button" onClick={() => chooseAlternative(item.name)}>
                            {item.mainCities?.[0] || item.name}
                        </button>
                    ))}
                </div>
            )}

            <button className="ai-fab" type="button" onClick={() => setAiOpen(true)}>
                <Bot size={22} />
                <span>AI Convert</span>
            </button>

            <AiConvertPanel open={aiOpen} onClose={() => setAiOpen(false)} />
        </main>
    );
}

export default App;
