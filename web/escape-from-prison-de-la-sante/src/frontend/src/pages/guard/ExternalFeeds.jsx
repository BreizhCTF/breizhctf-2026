import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Rss, RefreshCw, Trash2, Plus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { EXTERNAL_FEEDS } from '../../graphql/queries';
import { ADD_EXTERNAL_FEED, FETCH_EXTERNAL_FEED, REMOVE_EXTERNAL_FEED } from '../../graphql/mutations';
import { formatDateTime } from '../../lib/format';

export default function ExternalFeeds() {
  const { data, refetch } = useQuery(EXTERNAL_FEEDS);
  const [addFeed, { loading: addLoading }] = useMutation(ADD_EXTERNAL_FEED, {
    onCompleted: () => { toast.success('Source ajoutée'); refetch(); setForm({ name: '', url: '', type: 'json' }); },
    onError: (e) => toast.error(e.message),
  });
  const [fetchFeed] = useMutation(FETCH_EXTERNAL_FEED, {
    onCompleted: ({ fetchExternalFeed: r }) => {
      if (r.success) {
        toast.success(`Récupération réussie (HTTP ${r.statusCode})`);
        if (r.preview) setPreview(r.preview);
      } else {
        toast.error(r.error || 'Erreur de récupération');
      }
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const [removeFeed] = useMutation(REMOVE_EXTERNAL_FEED, {
    onCompleted: () => { toast.success('Source supprimée'); refetch(); },
  });

  const [form, setForm] = useState({ name: '', url: '', type: 'json' });
  const [activationCode, setActivationCode] = useState('');
  const [preview, setPreview] = useState('');
  const [fetchingId, setFetchingId] = useState(null);

  const feeds = data?.externalFeeds ?? [];

  async function handleFetch(id) {
    if (!activationCode.trim()) {
      toast.error('Code d\'activation requis');
      return;
    }
    setFetchingId(id);
    await fetchFeed({ variables: { feedId: id, activationCode: activationCode.trim() } });
    setFetchingId(null);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Flux réglementaires</h1>
        <p className="text-slate-400 text-sm mt-1">
          Sources de circulaires et notes officielles du Ministère de la Justice
        </p>
      </div>

      <div className="card mb-6 border-amber-500/30">
        <div className="flex items-center gap-2 mb-3">
          <span className="section-label">Code d'activation du service</span>
          <span className="badge badge-yellow">Requis</span>
        </div>
        <p className="text-slate-400 text-xs mb-3">
          Ce service nécessite un code d'activation fourni par l'administration centrale.
          Contactez le greffe si vous ne disposez pas de ce code.
        </p>
        <input
          className="input font-mono max-w-xs"
          placeholder="XXXX-XXXX"
          value={activationCode}
          onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
        />
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Ajouter une source</h2>
        <form onSubmit={(e) => { e.preventDefault(); addFeed({ variables: form }); }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom de la source</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Circulaires DAP" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">URL</label>
            <input className="input font-mono text-xs" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Format</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="json">JSON</option>
              <option value="rss">XML / RSS</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={addLoading} className="btn btn-primary disabled:opacity-50">
              <Plus size={15} />
              {addLoading ? 'Ajout…' : 'Ajouter la source'}
            </button>
          </div>
        </form>
      </div>

      {preview && (
        <div className="card mb-6 bg-slate-900">
          <div className="section-label mb-2">Aperçu de la dernière récupération</div>
          <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-48">{preview}</pre>
          <button onClick={() => setPreview('')} className="btn btn-ghost btn-sm mt-2">Fermer</button>
        </div>
      )}

      <div className="space-y-3">
        {feeds.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <Rss size={36} className="text-slate-600 mb-3" />
            <p className="text-slate-400">Aucune source configurée</p>
          </div>
        ) : (
          feeds.map((feed) => (
            <div key={feed.id} className="card">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{feed.name}</span>
                    <span className="badge badge-gray text-xs">{feed.type}</span>
                    {feed.lastStatus && (
                      <span className={`badge ${feed.lastStatus === 200 ? 'badge-green' : 'badge-red'}`}>
                        HTTP {feed.lastStatus}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-xs text-slate-400 truncate">{feed.url}</div>
                  {feed.lastFetched && (
                    <div className="text-xs text-slate-500 mt-1">
                      Dernière récupération : {formatDateTime(feed.lastFetched)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleFetch(feed.id)}
                    disabled={fetchingId === feed.id}
                    className="btn btn-primary btn-sm disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={fetchingId === feed.id ? 'animate-spin' : ''} />
                    Tester
                  </button>
                  <button
                    onClick={() => removeFeed({ variables: { feedId: feed.id } })}
                    className="btn btn-danger btn-sm"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
