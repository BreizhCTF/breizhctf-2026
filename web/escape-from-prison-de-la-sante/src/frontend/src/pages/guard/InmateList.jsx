import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import { USERS, ALL_BLOCS, SOLITARY_CONFINEMENTS } from '../../graphql/queries';
import { ADJUST_CONDUCT_SCORE, UPDATE_PRIVILEGES, PLACE_SOLITARY, UPDATE_INMATE_BLOC } from '../../graphql/mutations';
import { formatCurrency, conductColor } from '../../lib/format';

export default function InmateList() {
  const { data, refetch } = useQuery(USERS);
  const { data: blocsData } = useQuery(ALL_BLOCS);
  const [adjustConductScore] = useMutation(ADJUST_CONDUCT_SCORE, { onCompleted: () => { toast.success('Score ajusté'); refetch(); }, onError: (e) => toast.error(e.message) });
  const [placeSolitary] = useMutation(PLACE_SOLITARY, {
    refetchQueries: [{ query: SOLITARY_CONFINEMENTS, variables: { active: true } }],
    onCompleted: () => { toast.success('Détenu placé en isolement'); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [updateInmateBloc] = useMutation(UPDATE_INMATE_BLOC, { onCompleted: () => { toast.success('Détenu transféré'); refetch(); setTransferTarget(null); }, onError: (e) => toast.error(e.message) });

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [solitaryReason, setSolitaryReason] = useState('');
  const [solitaryDays, setSolitaryDays] = useState(3);
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferBlocId, setTransferBlocId] = useState('');

  const blocs = blocsData?.allBlocs ?? [];

  const inmates = (data?.users ?? []).filter((u) => u.role === 'inmate' && u.username.includes(search));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Liste des détenus</h1>
        <p className="text-slate-400 text-sm mt-1">Gestion de la population carcérale</p>
      </div>

      <div className="mb-4">
        <input className="input max-w-xs" placeholder="Rechercher un détenu…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Détenu</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Écrou / Cellule</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Bloc</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Conduite</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Solde</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inmates.map((u) => {
              const p = u.profile;
              const sc = p?.conductScore ?? 100;
              const color = conductColor(sc);
              return (
                <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-4">
                    <div className="font-semibold">{u.username}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    {p?.prisonNumber}<br />
                    <span className="text-slate-400">{p?.cell}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{p?.bloc?.name ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold" style={{ color }}>{sc}</span>
                  </td>
                  <td className="py-3 px-4 font-mono">{formatCurrency(p?.walletBalance ?? 0)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 flex-wrap">
                      {p?.isInSolitary && <span className="badge badge-red">isolement</span>}
                      {p?.status && <span className="badge badge-gray">{p.status}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => adjustConductScore({ variables: { inmateId: u.id, delta: 10, reason: 'Bonne conduite' } })}
                        className="btn btn-success btn-sm"
                      >+10</button>
                      <button
                        onClick={() => adjustConductScore({ variables: { inmateId: u.id, delta: -10, reason: 'Mauvaise conduite' } })}
                        className="btn btn-danger btn-sm"
                      >-10</button>
                      {!p?.isInSolitary && (
                        <button
                          onClick={() => setSelected(u)}
                          className="btn btn-ghost btn-sm"
                        >Isolement</button>
                      )}
                      <button
                        onClick={() => { setTransferTarget(u); setTransferBlocId(p?.bloc?.id ?? ''); }}
                        className="btn btn-ghost btn-sm"
                      >Transférer</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {transferTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="font-semibold mb-4">Transférer {transferTarget.username}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Bloc de destination</label>
                <select
                  className="input"
                  value={transferBlocId}
                  onChange={(e) => setTransferBlocId(e.target.value)}
                >
                  <option value="">— Choisir un bloc —</option>
                  {blocs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Aile {b.wing}) · {b.currentOccupancy}/{b.capacity} places
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => updateInmateBloc({ variables: { inmateId: transferTarget.id, blocId: transferBlocId } })}
                  disabled={!transferBlocId}
                  className="btn btn-primary disabled:opacity-50"
                >Confirmer le transfert</button>
                <button onClick={() => setTransferTarget(null)} className="btn btn-ghost">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="font-semibold mb-4">Placer {selected.username} en isolement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Motif</label>
                <textarea className="input resize-none" rows={2} value={solitaryReason} onChange={(e) => setSolitaryReason(e.target.value)} placeholder="Motif disciplinaire…" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Durée : {solitaryDays} jour{solitaryDays > 1 ? 's' : ''}</label>
                <input type="range" min="1" max="30" value={solitaryDays} onChange={(e) => setSolitaryDays(Number(e.target.value))} className="w-full accent-red-500" />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    placeSolitary({ variables: { inmateId: selected.id, reason: solitaryReason, durationDays: solitaryDays } });
                    setSelected(null);
                    setSolitaryReason('');
                    setSolitaryDays(3);
                  }}
                  disabled={!solitaryReason}
                  className="btn btn-danger disabled:opacity-50"
                >Confirmer</button>
                <button onClick={() => setSelected(null)} className="btn btn-ghost">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
