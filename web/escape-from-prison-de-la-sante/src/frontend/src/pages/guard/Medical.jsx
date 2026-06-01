import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import { GUARD_MEDICAL_REQUESTS } from '../../graphql/queries';
import { SCHEDULE_MEDICAL_APPOINTMENT, COMPLETE_MEDICAL_CONSULTATION, ADD_PRESCRIPTION } from '../../graphql/mutations';
import { timeAgo } from '../../lib/format';

const URGENCY_CLASSES = { standard: 'badge-blue', urgent: 'badge-yellow', emergency: 'badge-red' };

export default function GuardMedical() {
  const [status, setStatus] = useState(null);
  const { data, refetch } = useQuery(GUARD_MEDICAL_REQUESTS, { variables: { status } });
  const [scheduleAppointment] = useMutation(SCHEDULE_MEDICAL_APPOINTMENT, { onCompleted: () => { toast.success('Rendez-vous planifié'); refetch(); }, onError: (e) => toast.error(e.message) });
  const [completeConsultation] = useMutation(COMPLETE_MEDICAL_CONSULTATION, { onCompleted: () => { toast.success('Consultation complétée'); refetch(); }, onError: (e) => toast.error(e.message) });

  const [schedForms, setSchedForms] = useState({});
  const [completeForms, setCompleteForms] = useState({});

  const requests = data?.medicalRequests ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Infirmerie</h1>
        <p className="text-slate-400 text-sm mt-1">Gestion des demandes médicales</p>
      </div>

      <div className="flex gap-2 mb-5">
        {[null, 'pending', 'scheduled', 'completed'].map((s) => (
          <button key={String(s)} onClick={() => setStatus(s)} className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s === null ? 'Tous' : s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="card text-center py-10 text-slate-400">Aucune demande médicale</div>
        ) : (
          requests.map((req) => {
            const sf = schedForms[req.id] || { date: '', time: '' };
            const cf = completeForms[req.id] || { nurseNotes: '', diagnosis: '' };
            return (
              <div key={req.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex gap-2 mb-1">
                      <span className={`badge ${URGENCY_CLASSES[req.urgency]}`}>{req.urgency}</span>
                      <span className="text-xs text-slate-500">{timeAgo(req.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-300">{req.symptoms}</p>
                    <div className="text-xs text-slate-500 mt-1">Détenu : <strong>{req.inmate?.username}</strong></div>
                  </div>
                  <span className="badge badge-gray">{req.status}</span>
                </div>

                {req.status === 'pending' && (
                  <div className="mt-3 pt-3 border-t border-slate-700 flex gap-2 flex-wrap items-end">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Date</label>
                      <input type="date" className="input text-xs w-36" value={sf.date} onChange={(e) => setSchedForms({ ...schedForms, [req.id]: { ...sf, date: e.target.value } })} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Heure</label>
                      <input type="time" className="input text-xs w-28" value={sf.time} onChange={(e) => setSchedForms({ ...schedForms, [req.id]: { ...sf, time: e.target.value } })} />
                    </div>
                    <button
                      onClick={() => scheduleAppointment({ variables: { requestId: req.id, date: sf.date, time: sf.time } })}
                      disabled={!sf.date || !sf.time}
                      className="btn btn-primary btn-sm disabled:opacity-50"
                    >Planifier</button>
                  </div>
                )}

                {req.status === 'scheduled' && (
                  <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Notes infirmière</label>
                      <textarea className="input text-xs resize-none" rows={2} value={cf.nurseNotes} onChange={(e) => setCompleteForms({ ...completeForms, [req.id]: { ...cf, nurseNotes: e.target.value } })} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Diagnostic</label>
                      <input className="input text-xs" value={cf.diagnosis} onChange={(e) => setCompleteForms({ ...completeForms, [req.id]: { ...cf, diagnosis: e.target.value } })} />
                    </div>
                    <button
                      onClick={() => completeConsultation({ variables: { requestId: req.id, nurseNotes: cf.nurseNotes, diagnosis: cf.diagnosis } })}
                      disabled={!cf.nurseNotes}
                      className="btn btn-success btn-sm disabled:opacity-50"
                    >Compléter la consultation</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
