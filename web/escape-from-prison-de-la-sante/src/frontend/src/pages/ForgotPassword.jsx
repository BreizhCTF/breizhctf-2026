import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setSubmitted(true);
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
          <p className="text-slate-400 text-sm mt-1">Réinitialisation du mot de passe</p>
        </div>

        <div className="card">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2">Demande enregistrée</h2>
              <p className="text-slate-400 text-sm">
                Si un compte est associé à cette adresse, un lien de réinitialisation vous a été envoyé par e-mail institutionnel.
              </p>
              <Link to="/login" className="btn btn-ghost btn-sm mt-6 inline-flex">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1">Mot de passe oublié</h2>
              <p className="text-slate-400 text-sm mb-6">
                Saisissez votre adresse e-mail institutionnelle. Si elle correspond à un compte, un lien de réinitialisation vous sera envoyé.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Adresse e-mail institutionnelle
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="p.nom@penitentiaire-sante.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full justify-center py-2.5"
                >
                  {loading ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Ministère de la Justice — Accès réservé au personnel autorisé
        </p>
      </div>
    </div>
  );
}
