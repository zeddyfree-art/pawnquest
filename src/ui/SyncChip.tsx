import { useState } from 'react';
import { connectDrive, useDrive } from '../store/drive';

/** In the top bar while syncing is paused because Google's sign-in ran out: one tap signs in again. */
export function SyncChip() {
  const status = useDrive((s) => (s.connected ? s.status : 'off'));
  const [busy, setBusy] = useState(false);
  if (status !== 'needs-auth') return null;
  return (
    <button
      className="sync-chip"
      disabled={busy}
      title="Sign in to Google to sync your progress"
      onClick={() => {
        setBusy(true);
        void connectDrive().finally(() => setBusy(false));
      }}
    >
      ↻ Sync
    </button>
  );
}
