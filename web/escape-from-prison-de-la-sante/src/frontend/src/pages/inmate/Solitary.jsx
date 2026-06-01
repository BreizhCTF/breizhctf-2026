import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { MY_PROFILE, MY_SOLITARY_JOURNAL } from '../../graphql/queries';
import { WRITE_SOLITARY_JOURNAL } from '../../graphql/mutations';
import SolitaryCountdown from '../../components/SolitaryCountdown';

export default function Solitary() {
  const { data: profileData } = useQuery(MY_PROFILE);
  const { data: journalData, refetch } = useQuery(MY_SOLITARY_JOURNAL);
  const [writeEntry, { loading }] = useMutation(WRITE_SOLITARY_JOURNAL, {
    onCompleted: () => { refetch(); setContent(''); },
  });
  const [content, setContent] = useState('');

  const profile = profileData?.myProfile;
  const solitary = profile?.activeSolitary;
  const entries = journalData?.mySolitaryJournal ?? [];

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', color: '#5A5A5A', fontFamily: 'Inter, sans-serif', padding: '0' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ margin: '0 auto 20px', display: 'block' }}>
            <rect x="5" y="5" width="70" height="70" rx="4" fill="none" stroke="#2A2A2A" strokeWidth="2" />
            {[20, 30, 40, 50, 60].map((x) => (
              <line key={x} x1={x} y1="5" x2={x} y2="75" stroke="#2A2A2A" strokeWidth="1.5" />
            ))}
            <rect x="10" y="55" width="60" height="15" rx="2" fill="#1A1A1A" />
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#7A7A7A', letterSpacing: '-0.02em', marginBottom: 8 }}>
            Quartier d'isolement
          </h1>
          <p style={{ fontSize: 13 }}>Cellule d'isolement disciplinaire — Pénitentiaire de la Santé</p>
        </div>

        {solitary && (
          <div style={{ border: '1px solid #2A2A2A', borderRadius: 8, padding: 24, marginBottom: 32, textAlign: 'center' }}>
            <SolitaryCountdown endsAt={solitary.endsAt} />
            <div style={{ marginTop: 12, fontSize: 12 }}>
              Motif : {solitary.reason}
            </div>
          </div>
        )}

        <div style={{ border: '1px solid #1E1E1E', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, color: '#4A4A4A' }}>
            Journal d'isolement
          </div>
          <textarea
            style={{
              width: '100%', background: '#0F0F0F', border: '1px solid #2A2A2A', borderRadius: 6,
              color: '#7A7A7A', fontFamily: 'Inter, sans-serif', fontSize: 14, padding: 12,
              resize: 'none', outline: 'none', boxSizing: 'border-box', minHeight: 120,
            }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Consignez vos pensées…"
          />
          <button
            onClick={() => content.trim() && writeEntry({ variables: { content } })}
            disabled={loading || !content.trim()}
            style={{
              marginTop: 10, background: '#1E1E1E', border: '1px solid #2A2A2A',
              color: '#6A6A6A', padding: '8px 20px', borderRadius: 6,
              cursor: loading || !content.trim() ? 'not-allowed' : 'pointer',
              fontSize: 13, opacity: loading || !content.trim() ? 0.5 : 1,
            }}
          >
            {loading ? 'Enregistrement…' : 'Consigner'}
          </button>
        </div>

        {entries.length > 0 && (
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, color: '#4A4A4A' }}>
              Entrées précédentes
            </div>
            {entries.map((entry) => (
              <div key={entry.id} style={{ border: '1px solid #1A1A1A', borderRadius: 6, padding: 14, marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#3A3A3A', marginBottom: 6, fontFamily: 'DM Mono, monospace' }}>
                  {new Date(entry.writtenAt).toLocaleString('fr-FR')}
                </div>
                <p style={{ fontSize: 14, lineHeight: '1.6', color: '#5A5A5A' }}>{entry.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
