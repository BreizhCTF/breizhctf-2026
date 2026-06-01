import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, Phone, AlertCircle, TrendingUp, Swords, Skull, Clock } from 'lucide-react';
import { ME, MY_WALLET, MY_VISIT_REQUESTS, MY_GANG, PRISON_EVENTS } from '../../graphql/queries';
import { formatCurrency, formatDate, timeAgo } from '../../lib/format';
import ConductGauge from '../../components/ConductGauge';
import ReputationBadge from '../../components/ReputationBadge';

export default function Dashboard() {
  const { data: meData } = useQuery(ME);
  const { data: walletData } = useQuery(MY_WALLET);
  const { data: visitsData } = useQuery(MY_VISIT_REQUESTS);
  const { data: gangData } = useQuery(MY_GANG);
  const { data: eventsData } = useQuery(PRISON_EVENTS);

  const me = meData?.me;
  const myGang = gangData?.myGang;
  const nextEvents = (eventsData?.prisonEvents ?? []).slice(0, 3);
  const profile = me?.profile;
  const recentTransactions = walletData?.myWallet?.slice(0, 5) ?? [];
  const upcomingVisit = visitsData?.myVisitRequests?.find(
    (v) => v.status === 'approved' && new Date(v.requestedDate) >= new Date()
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="text-slate-400 text-sm mt-1">
          Bienvenue, <span className="font-semibold text-slate-200">{me?.username}</span>
          {profile && (
            <span className="ml-2 text-slate-500">— Écrou <span className="font-mono">{profile.prisonNumber}</span>, {profile.bloc?.name}</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="card flex flex-col items-center py-6">
          <div className="section-label mb-4">Score de conduite</div>
          <ConductGauge score={profile?.conductScore ?? 100} />
          <div className="mt-3">
            <ReputationBadge score={profile?.reputationScore ?? 50} />
          </div>
          {myGang && (
            <Link to="/gang" className="mt-2 text-xs text-amber-400 hover:text-amber-300">
              Gang : {myGang.name}
            </Link>
          )}
        </div>

        <div className="card">
          <div className="section-label mb-4">Finances</div>
          <div className="text-3xl font-bold font-mono mb-1">
            {formatCurrency(profile?.walletBalance ?? 0)}
          </div>
          <div className="text-slate-400 text-sm mb-4">Solde disponible</div>
          <div className="flex gap-4">
            <div>
              <div className="text-xs text-slate-500">Crédits tél.</div>
              <div className="font-mono font-semibold text-amber-400">{profile?.phoneCredits ?? 0}</div>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-[160px]">{t.description}</span>
                <span className={`font-mono font-semibold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-label mb-4">Informations</div>
          {profile ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-500">Cellule</div>
                <div className="font-mono font-semibold">{profile.cell}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Bloc</div>
                <div className="font-semibold">{profile.bloc?.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Date d'entrée</div>
                <div className="font-mono text-sm">{formatDate(profile.entryDate)}</div>
              </div>
              {profile.releaseDate && (
                <div>
                  <div className="text-xs text-slate-500">Date de libération</div>
                  <div className="font-mono text-sm text-green-400">{formatDate(profile.releaseDate)}</div>
                </div>
              )}
              <div className="pt-2">
                <span className={`badge ${profile.status === 'incarcerated' ? 'badge-blue' : 'badge-green'}`}>
                  {profile.status}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-sm">Chargement…</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card">
          <div className="section-label mb-4">Prochaine visite</div>
          {upcomingVisit ? (
            <div>
              <div className="font-semibold">{upcomingVisit.visitorName}</div>
              <div className="text-slate-400 text-sm">{upcomingVisit.visitorRelation}</div>
              <div className="mt-2 flex gap-3 text-sm">
                <span className="font-mono text-blue-400">{formatDate(upcomingVisit.requestedDate)}</span>
                <span className="text-slate-500">{upcomingVisit.timeSlot}</span>
              </div>
              {upcomingVisit.parloirSession && (
                <Link to={`/parloir/${upcomingVisit.id}`} className="btn btn-primary btn-sm mt-3 inline-flex">
                  Accéder au parloir
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <Calendar size={28} className="text-slate-600 mb-2" />
              <p className="text-slate-400 text-sm">Aucune visite planifiée</p>
              <Link to="/visites" className="btn btn-ghost btn-sm mt-3">Demander une visite</Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-label mb-4">Accès rapides</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/travail', icon: Briefcase, label: 'Postes de travail', color: 'text-green-400' },
              { to: '/boutique', icon: TrendingUp, label: 'Boutique', color: 'text-blue-400' },
              { to: '/telephone', icon: Phone, label: 'Téléphone', color: 'text-amber-400' },
              { to: '/gang', icon: Swords, label: 'Gang', color: 'text-red-400' },
              { to: '/marche-noir', icon: Skull, label: 'Marché Noir', color: 'text-purple-400' },
              { to: '/emploi-du-temps', icon: Clock, label: 'Planning', color: 'text-cyan-400' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <Icon size={16} className={color} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
