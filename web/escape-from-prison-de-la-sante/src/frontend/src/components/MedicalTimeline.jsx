import { Activity, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatDate, timeAgo } from '../lib/format';

const URGENCY_CLASSES = {
  standard:  { badge: 'badge-blue',   label: 'Standard' },
  urgent:    { badge: 'badge-orange', label: 'Urgent' },
  emergency: { badge: 'badge-red',    label: 'Urgence absolue' },
};

const STATUS_ICONS = {
  pending:   { icon: Clock,         color: 'text-yellow-400' },
  scheduled: { icon: Activity,      color: 'text-blue-400'   },
  completed: { icon: CheckCircle,   color: 'text-green-400'  },
  cancelled: { icon: XCircle,       color: 'text-red-400'    },
};

export default function MedicalTimeline({ requests }) {
  if (!requests?.length) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Aucune consultation enregistrée
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />
      <div className="space-y-5">
        {requests.map((req) => {
          const urgencyMeta = URGENCY_CLASSES[req.urgency] ?? URGENCY_CLASSES.standard;
          const statusMeta = STATUS_ICONS[req.status] ?? STATUS_ICONS.pending;
          const Icon = statusMeta.icon;

          return (
            <div key={req.id} className="flex gap-4 pl-2">
              <div className={`w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center flex-shrink-0 mt-1 ${statusMeta.color}`}>
                <Icon size={12} />
              </div>
              <div className="card flex-1">
                <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${urgencyMeta.badge}`}>{urgencyMeta.label}</span>
                    <span className={`badge ${req.status === 'completed' ? 'badge-green' : req.status === 'cancelled' ? 'badge-red' : req.status === 'scheduled' ? 'badge-blue' : 'badge-yellow'}`}>
                      {req.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{timeAgo(req.createdAt)}</span>
                </div>

                <p className="text-sm text-slate-300 mb-2">{req.symptoms}</p>

                {req.appointmentDate && (
                  <div className="text-xs text-slate-500 mb-2">
                    RDV : <span className="font-mono text-blue-400">{formatDate(req.appointmentDate)}</span>
                    {req.appointmentTime && <span className="ml-1">à {req.appointmentTime}</span>}
                  </div>
                )}

                {req.diagnosis && (
                  <div className="text-xs bg-slate-700/50 rounded px-3 py-2 mb-2">
                    <span className="text-slate-400 font-semibold">Diagnostic : </span>
                    <span className="text-slate-300">{req.diagnosis}</span>
                  </div>
                )}

                {req.prescriptions?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {req.prescriptions.map((p) => (
                      <span key={p.id} className="text-xs bg-teal-900/40 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full">
                        {p.medicationName} · {p.dosage}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
