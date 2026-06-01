import { useState, useEffect } from 'react';

export default function SolitaryCountdown({ endsAt }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const calc = () => setRemaining(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (remaining === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#6A6A6A', fontFamily: 'DM Mono, monospace' }}>
        <div style={{ fontSize: 14 }}>Période d'isolement terminée</div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', color: '#5A5A5A' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
        Libération dans
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start' }}>
        {days > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: '#6A6A6A' }}>{pad(days)}</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>jour{days > 1 ? 's' : ''}</div>
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: '#6A6A6A' }}>{pad(hours)}</div>
          <div style={{ fontSize: 10, marginTop: 4 }}>heures</div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, color: '#4A4A4A', lineHeight: 1, paddingTop: 0 }}>:</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: '#6A6A6A' }}>{pad(mins)}</div>
          <div style={{ fontSize: 10, marginTop: 4 }}>min</div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, color: '#4A4A4A', lineHeight: 1 }}>:</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: '#6A6A6A' }}>{pad(secs)}</div>
          <div style={{ fontSize: 10, marginTop: 4 }}>sec</div>
        </div>
      </div>
    </div>
  );
}
