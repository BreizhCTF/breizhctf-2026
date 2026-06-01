import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../lib/auth';
import { client } from '../apollo';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.username, form.password);
      await client.clearStore();
      if (data.user.role === 'inmate') {
        navigate('/', { replace: true });
      } else {
        navigate('/administration', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-600 mb-4">
            <span className="text-2xl">⚖️</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pénitentiaire de la Santé</h1>
          <p className="text-slate-400 text-sm mt-1">Portail de gestion pénitentiaire — Paris</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-1">Connexion</h2>
          <p className="text-slate-400 text-sm mb-6">Identifiez-vous avec vos identifiants institutionnels</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Identifiant</label>
              <input
                className="input"
                type="text"
                placeholder="p.nom"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mot de passe</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5"
            >
              {loading ? 'Connexion en cours…' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Ministère de la Justice — Accès réservé au personnel autorisé
        </p>
      </div>
    </div>
  );
}
