import { useQuery } from '@apollo/client';
import { Users, AlertCircle, Calendar, Lock, Mail, ArrowRightLeft, Search } from 'lucide-react';
import { USERS, GUARD_INCIDENTS, VISIT_REQUESTS, SOLITARY_CONFINEMENTS, ALL_MAIL, FLAGGED_TRANSFERS } from '../../graphql/queries';
import { timeAgo } from '../../lib/format';

function KPI({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</div>
          <div className={`text-3xl font-bold font-mono ${color || 'text-slate-100'}`}>{value}</div>
          {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
        <div className="p-2.5 rounded-lg bg-slate-700">
          <Icon size={18} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}

export default function GuardDashboard() {
  const { data: usersData } = useQuery(USERS);
  const { data: incidentsData } = useQuery(GUARD_INCIDENTS, { variables: { status: 'open' } });
  const { data: visitsData } = useQuery(VISIT_REQUESTS, { variables: { status: 'pending' } });
  const { data: solitaryData } = useQuery(SOLITARY_CONFINEMENTS, { variables: { active: true } });
  const { data: mailData } = useQuery(ALL_MAIL, { variables: { status: 'pending' } });
  const { data: transfersData } = useQuery(FLAGGED_TRANSFERS);

  const inmates = usersData?.users?.filter((u) => u.role === 'inmate') ?? [];
  const incidents = incidentsData?.incidents ?? [];
  const pendingVisits = visitsData?.visitRequests ?? [];
  const solitaryCount = solitaryData?.solitaryConfinements?.length ?? 0;
  const pendingMailCount = mailData?.allMail?.length ?? 0;
  const flaggedTransferCount = transfersData?.flaggedTransfers?.length ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Administration</h1>
        <p className="text-slate-400 text-sm mt-1">Tableau de bord du personnel de surveillance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
        <KPI label="Détenus" value={inmates.length} sub="Effectif total" icon={Users} />
        <KPI label="Incidents ouverts" value={incidents.length} sub="En attente" color="text-orange-400" icon={AlertCircle} />
        <KPI label="Visites en attente" value={pendingVisits.length} sub="À approuver" color="text-amber-400" icon={Calendar} />
        <KPI label="En isolement" value={solitaryCount} sub="Mesures actives" color="text-red-400" icon={Lock} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-6">
        <KPI label="Courrier en attente" value={pendingMailCount} sub="À contrôler" color="text-blue-400" icon={Mail} />
        <KPI label="Transferts signalés" value={flaggedTransferCount} sub="Suspects" color="text-purple-400" icon={ArrowRightLeft} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card">
          <div className="section-label mb-4">Incidents récents</div>
          {incidents.slice(0, 8).length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun incident ouvert</p>
          ) : (
            <div className="space-y-2">
              {incidents.slice(0, 8).map((inc) => (
                <div key={inc.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{inc.type}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[220px]">{inc.description}</div>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0 ml-2">{timeAgo(inc.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-label mb-4">Visites à approuver</div>
          {pendingVisits.slice(0, 6).length === 0 ? (
            <p className="text-slate-400 text-sm">Aucune visite en attente</p>
          ) : (
            <div className="space-y-2">
              {pendingVisits.slice(0, 6).map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{v.visitorName}</div>
                    <div className="text-xs text-slate-400">{v.inmate?.username} · {v.requestedDate}</div>
                  </div>
                  <span className="badge badge-yellow">pending</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
