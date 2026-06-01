import { useQuery } from '@apollo/client';
import { MY_PROFILE, MY_WALLET, ME } from '../../graphql/queries';
import { formatDate, formatCurrency, conductColor } from '../../lib/format';

export default function Profile() {
  const { data: meData } = useQuery(ME);
  const { data: profileData } = useQuery(MY_PROFILE);
  const { data: walletData } = useQuery(MY_WALLET);

  const me = meData?.me;
  const profile = profileData?.myProfile;
  const transactions = walletData?.myWallet ?? [];

  const score = profile?.conductScore ?? 100;
  const color = conductColor(score);
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  const privs = profile?.privileges;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Mon profil</h1>
        <p className="text-slate-400 text-sm mt-1">Votre dossier pénitentiaire</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card flex flex-col items-center py-6">
          <div className="relative w-28 h-28 mb-3">
            <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
              <circle cx="50" cy="50" r={r} fill="none" stroke="#334155" strokeWidth="8" />
              <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold" style={{ color }}>{score}</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
          </div>
          <div className="text-sm font-semibold" style={{ color }}>Score de conduite</div>
        </div>

        <div className="card md:col-span-2">
          <div className="section-label mb-4">Informations d'écrou</div>
          {profile ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-400">Numéro d'écrou</div>
                <div className="font-mono font-bold">{profile.prisonNumber}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Cellule</div>
                <div className="font-mono">{profile.cell}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Bloc</div>
                <div>{profile.bloc?.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Statut</div>
                <div><span className="badge badge-blue">{profile.status}</span></div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Date d'entrée</div>
                <div className="font-mono">{formatDate(profile.entryDate)}</div>
              </div>
              {profile.releaseDate && (
                <div>
                  <div className="text-xs text-slate-400">Libération prévue</div>
                  <div className="font-mono text-green-400">{formatDate(profile.releaseDate)}</div>
                </div>
              )}
              <div className="col-span-2">
                <div className="text-xs text-slate-400">Chef d'inculpation</div>
                <div>{profile.offense}</div>
              </div>
            </div>
          ) : <div className="text-slate-400 text-sm">Chargement…</div>}
        </div>
      </div>

      {privs && (
        <div className="card mb-6">
          <div className="section-label mb-4">Privilèges accordés</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: 'yard', label: 'Cour' },
              { key: 'library', label: 'Bibliothèque' },
              { key: 'work', label: 'Travail' },
              { key: 'visits', label: 'Visites' },
              { key: 'phone', label: 'Téléphone' },
            ].map(({ key, label }) => (
              <div key={key} className={`p-3 rounded-lg text-center ${privs[key] ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <div className={`text-xs font-semibold ${privs[key] ? 'text-green-400' : 'text-red-400'}`}>
                  {privs[key] ? '✓' : '✗'} {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-label mb-4">Historique des transactions</div>
        {transactions.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">Aucune transaction</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                <div>
                  <div className="text-sm">{t.description}</div>
                  <div className="text-xs text-slate-500">{t.type}</div>
                </div>
                <span className={`font-mono font-semibold text-sm ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
