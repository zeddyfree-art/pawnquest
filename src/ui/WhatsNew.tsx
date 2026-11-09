import { useEffect, useState } from 'react';
import { feedbackHref, markVersionSeen, newsToShow, type ChangelogEntry } from '../changelog';

/** Once after an update: a scroll with what is new in this version. A new hero has nothing older to compare with. */
export function WhatsNew() {
  const [entry, setEntry] = useState<ChangelogEntry | null>(null);
  useEffect(() => setEntry(newsToShow(false)), []);
  if (!entry) return null;
  const close = () => {
    markVersionSeen();
    setEntry(null);
  };
  return (
    <div className="news-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="panel news" role="dialog" aria-modal aria-label={`New in version ${entry.version}`}>
        <h2 className="pixel">New in version {entry.version}</h2>
        <ul>
          {entry.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
        <p className="muted small">
          Something not right, or an idea? <a href={feedbackHref()}>Send feedback</a>.
        </p>
        <button className="btn primary" autoFocus onClick={close}>
          Onward!
        </button>
      </div>
    </div>
  );
}
