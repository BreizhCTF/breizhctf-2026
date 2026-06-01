import { Outlet, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import {
  LayoutDashboard, Users, Briefcase, ShoppingBag, Package,
  Home, Calendar, Phone, BookOpen, AlertCircle, Heart,
  FileText, Lock, User, LogOut, Wifi, Swords, Skull,
  GraduationCap, ArrowRightLeft, Mail, Clock
} from 'lucide-react';
import { ME } from '../../graphql/queries';
import { logout } from '../../lib/auth';
import { formatCurrency } from '../../lib/format';
import { client } from '../../apollo';

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/cour', label: 'La Cour', icon: Users },
  { to: '/travail', label: 'Travail', icon: Briefcase },
  { to: '/boutique', label: 'Boutique', icon: ShoppingBag },
  { to: '/inventaire', label: 'Inventaire', icon: Package },
  { to: '/cellule', label: 'Ma Cellule', icon: Home },
  { to: '/visites', label: 'Visites', icon: Calendar },
  { to: '/telephone', label: 'Téléphone', icon: Phone },
  { to: '/bibliotheque', label: 'Bibliothèque', icon: BookOpen },
  { to: '/signalements', label: 'Signalements', icon: AlertCircle },
  { to: '/medical', label: 'Infirmerie', icon: Heart },
  { to: '/permissions', label: 'Permissions', icon: FileText },
  { to: '/isolement', label: 'Isolement', icon: Lock },
  { to: '/gang', label: 'Gang', icon: Swords },
  { to: '/marche-noir', label: 'Marché Noir', icon: Skull },
  { to: '/programmes', label: 'Programmes', icon: GraduationCap },
  { to: '/transferts', label: 'Transferts', icon: ArrowRightLeft },
  { to: '/courrier', label: 'Courrier', icon: Mail },
  { to: '/emploi-du-temps', label: 'Planning', icon: Clock },
  { to: '/profil', label: 'Mon profil', icon: User },
];

export default function InmateLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useQuery(ME, { pollInterval: 30000 });
  const me = data?.me;
  const profile = me?.profile;
  const isInSolitary = profile?.isInSolitary;

  async function handleLogout() {
    await logout();
    await client.clearStore();
    navigate('/login');
  }

  const conductScore = profile?.conductScore ?? 100;
  const conductCol = conductScore >= 70 ? '#22C55E' : conductScore >= 40 ? '#F97316' : '#EF4444';
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (conductScore / 100) * circumference;

  if (isInSolitary) {
    if (location.pathname !== '/isolement') {
      return <Navigate to="/isolement" replace />;
    }
    return (
      <div style={{ background: '#0A0A0A', minHeight: '100vh', color: '#4A4A4A', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⬛</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#6A6A6A', letterSpacing: '-0.02em' }}>
              Quartier d'isolement disciplinaire
            </h1>
            <p style={{ fontSize: 14, marginTop: 8 }}>Pénitentiaire de la Santé</p>
          </div>
          <Outlet />
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #3A3A3A', color: '#6A6A6A', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <nav className="w-60 min-h-screen bg-slate-800 border-r border-slate-600 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-600">
          <div className="text-xs font-bold tracking-widest uppercase text-amber-400">Pénitentiaire</div>
          <div className="text-xs text-slate-400 mt-0.5 font-mono">de la Santé</div>
        </div>

        {me && (
          <div className="p-4 border-b border-slate-600">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="#334155" strokeWidth="3" />
                  <circle cx="20" cy="20" r="18" fill="none" stroke={conductCol} strokeWidth="3"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold" style={{ color: conductCol }}>
                  {conductScore}
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{me.username}</div>
                <div className="text-xs text-slate-400 font-mono">{formatCurrency(profile?.walletBalance ?? 0)}</div>
              </div>
            </div>
            {profile?.bloc && (
              <div className="mt-2 text-xs text-slate-500">
                {profile.bloc.name} · Cellule <span className="font-mono">{profile.cell}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-3 px-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-blue-400'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="p-3 border-t border-slate-600">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
