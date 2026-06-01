import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Heart, AlertTriangle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_MEDICAL_REQUESTS, MY_ACTIVE_PRESCRIPTIONS, MY_PROFILE } from '../../graphql/queries';
import { CREATE_MEDICAL_REQUEST, CREATE_EMERGENCY_ALERT } from '../../graphql/mutations';
import { formatDate } from '../../lib/format';
import MedicalTimeline from '../../components/MedicalTimeline';

export default function Medical() {
  const { data: reqData, refetch } = useQuery(MY_MEDICAL_REQUESTS, { pollInterval: 20000 });
  const { data: presData } = useQuery(MY_ACTIVE_PRESCRIPTIONS);
  const { data: profileData } = useQuery(MY_PROFILE);
  const [createMedicalRequest, { loading }] = useMutation(CREATE_MEDICAL_REQUEST, {
    onCompleted: () => { toast.success('Demande de consultation envoyée'); refetch(); setShowForm(false); setForm({ symptoms: '', urgency: 'standard' }); },
    onError: (e) => toast.error(e.message),
  });
  const [createEmergencyAlert, { loading: emergencyLoading }] = useMutation(CREATE_EMERGENCY_ALERT, {
    onCompleted: () => { toast.success('Alerte médicale déclenchée. Secours en route.'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ symptoms: '', urgency: 'standard' });

  const requests = reqData?.myMedicalRequests ?? [];
  const prescriptions = presData?.myActivePrescriptions ?? [];
  const medRecord = profileData?.myProfile?.medicalRecord;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Infirmerie</h1>
          <p className="text-slate-400 text-sm mt-1">Santé et soins médicaux</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            <Plus size={16} />
            Demande de consultation
          </button>
          <button
            onClick={() => { if (window.confirm('Confirmer l\'alerte médicale d\'urgence ?')) createEmergencyAlert(); }}
            disabled={emergencyLoading}
            className="btn btn-danger disabled:opacity-50"
          >
            <AlertTriangle size={16} />
            Urgence médicale
          </button>
        </div>
      </div>

      {medRecord && (
        <div className="card mb-6 border-l-4 border-blue-500">
          <div className="section-label mb-3">Dossier médical</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-400">Groupe sanguin</div>
              <div className="font-mono font-bold text-lg">{medRecord.bloodType ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Allergies</div>
              <div className="text-slate-300">{medRecord.allergies ?? 'Aucune connue'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Antécédents</div>
              <div className="text-slate-300">{medRecord.chronicConditions ?? 'Aucun'}</div>
            </div>
          </div>
        </div>
      )}

      {prescriptions.length > 0 && (
        <div className="card mb-6">
          <div className="section-label mb-3">Prescriptions actives</div>
          <div className="space-y-2">
            {prescriptions.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div>
                  <div className="font-semibold text-sm">{p.medicationName}</div>
                  <div className="text-xs text-slate-400">{p.dosage} · {p.frequency}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Jusqu'au</div>
                  <div className="font-mono text-xs text-amber-400">{p.endDate ? formatDate(p.endDate) : 'Indéfini'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Demande de consultation</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMedicalRequest({ variables: form }); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Symptômes</label>
              <textarea className="input resize-none" rows={3} value={form.symptoms}
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                placeholder="Décrivez vos symptômes…" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Urgence</label>
              <select className="input" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">
                {loading ? 'Envoi…' : 'Envoyer'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="section-label mb-5">Historique des consultations</div>
        <MedicalTimeline requests={requests} />
      </div>
    </div>
  );
}
