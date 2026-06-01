import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Search, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { USERS } from '../../graphql/queries';
import { PERFORM_CELL_SEARCH } from '../../graphql/mutations';

export default function CellSearch() {
  const { data } = useQuery(USERS);
  const [selectedInmate, setSelectedInmate] = useState('');
  const [results, setResults] = useState([]);

  const inmates = data?.users ?? [];

  const [search, { loading }] = useMutation(PERFORM_CELL_SEARCH, {
    onCompleted: (data) => {
      const r = data.performCellSearch;
      setResults((prev) => [{ inmateId: selectedInmate, ...r, time: new Date().toLocaleTimeString() }, ...prev]);
      if (r.seized > 0) toast.error(r.message);
      else toast.success(r.message);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Fouilles de Cellule</h1>
        <p className="text-slate-400 text-sm mt-1">Sélectionnez un détenu pour effectuer une fouille</p>
      </div>

      <div className="card mb-5">
        <div className="section-label mb-4">Effectuer une fouille</div>
        <div className="flex gap-3">
          <select className="input flex-1" value={selectedInmate} onChange={(e) => setSelectedInmate(e.target.value)}>
            <option value="">Sélectionner un détenu…</option>
            {inmates.map((i) => (
              <option key={i.id} value={i.id}>{i.username} — {i.profile?.cell} ({i.profile?.bloc?.name})</option>
            ))}
          </select>
          <button
            onClick={() => { if (selectedInmate) search({ variables: { inmateId: selectedInmate } }); }}
            disabled={loading || !selectedInmate}
            className="btn btn-primary disabled:opacity-50"
          >
            <Search size={14} /> Fouiller
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-label mb-4">Résultats des fouilles</div>
        {results.length === 0 ? (
          <div className="text-center py-6">
            <Shield size={28} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Aucune fouille effectuée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className={`flex items-center justify-between py-3 px-4 rounded-lg ${r.seized > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                <div>
                  <div className="text-sm font-medium">{r.message}</div>
                  <div className="text-xs text-slate-500">{r.time}</div>
                </div>
                <span className={`badge ${r.seized > 0 ? 'badge-red' : 'badge-green'}`}>
                  {r.seized > 0 ? `${r.seized} saisi(s)` : 'RAS'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
