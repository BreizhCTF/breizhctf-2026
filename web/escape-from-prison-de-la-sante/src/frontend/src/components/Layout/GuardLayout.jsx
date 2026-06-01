import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, MessageSquare, AlertCircle, Heart,
  Lock, FileText, Phone, Megaphone, Rss, LogOut, Shield, Search,
  Mail, ArrowRightLeft, Clock
} from 'lucide-react';
import { logout, getUser } from '../../lib/auth';
import { client } from '../../apollo';

const navItems = [
  { to: '/administration', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/administration/detenus', label: 'Détenus', icon: Users },
  { to: '/administration/visites', label: 'Visites', icon: Calendar },
  { to: '/administration/parloirs', label: 'Parloirs actifs', icon: MessageSquare },
  { to: '/administration/incidents', label: 'Incidents', icon: AlertCircle },
  { to: '/administration/medical', label: 'Médical', icon: Heart },
  { to: '/administration/isolement', label: 'Isolement', icon: Lock },
  { to: '/administration/permissions', label: 'Permissions', icon: FileText },
  { to: '/administration/contacts', label: 'Contacts approuvés', icon: Phone },
  { to: '/administration/annonces', label: 'Annonces', icon: Megaphone },
  { to: '/administration/flux', label: 'Flux réglementaires', icon: Rss },
  { to: '/administration/fouilles', label: 'Fouilles', icon: Search },
  { to: '/administration/courrier', label: 'Courrier', icon: Mail },
  { to: '/administration/transferts', label: 'Transferts', icon: ArrowRightLeft },
  { to: '/administration/emploi-du-temps', label: 'Planning', icon: Clock },
];

export default function GuardLayout() {
  const navigate = useNavigate();
  const user = getUser();

  async function handleLogout() {
    await logout();
    await client.clearStore();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <nav className="w-64 min-h-screen bg-slate-800 border-r border-slate-600 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-400" />
            <div>
              <div className="text-xs font-bold tracking-widest uppercase text-blue-400">Administration</div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">Pénitentiaire de la Santé</div>
            </div>
          </div>
        </div>

        {user && (
          <div className="p-4 border-b border-slate-600">
            <div className="text-sm font-semibold">{user.username}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {user.role === 'director' ? 'Directeur' : 'Agent de surveillance'}
            </div>
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

      <main className="flex-1 overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}
