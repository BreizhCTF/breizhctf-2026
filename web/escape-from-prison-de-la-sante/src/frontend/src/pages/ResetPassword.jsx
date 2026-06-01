import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Token invalide ou expiré');
      navigate('/login', { replace: true, state: { resetSuccess: true } });
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
          <p className="text-slate-400 text-sm mt-1">Nouveau mot de passe</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-1">Choisir un nouveau mot de passe</h2>
          <p className="text-slate-400 text-sm mb-6">
            Saisissez votre nouveau mot de passe. Il doit contenir au moins 8 caractères.
          </p>

          {!token && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              Token de réinitialisation manquant. Vérifiez le lien reçu par e-mail.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Nouveau mot de passe
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                disabled={!token}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={!token}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !token}
              className="btn btn-primary w-full justify-center py-2.5 disabled:opacity-50"
            >
              {loading ? 'Enregistrement…' : 'Définir le nouveau mot de passe'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Retour à la connexion
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
