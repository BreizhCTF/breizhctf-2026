import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import { USERS } from '../../graphql/queries';
import { APPROVE_CONTACT } from '../../graphql/mutations';

export default function GuardContacts() {
  const { data } = useQuery(USERS);
  const [approveContact, { loading }] = useMutation(APPROVE_CONTACT, {
    onCompleted: () => { toast.success('Contact approuvé'); setForm({ inmateId: '', contactName: '', contactPhone: '', relation: '' }); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ inmateId: '', contactName: '', contactPhone: '', relation: '' });
  const inmates = (data?.users ?? []).filter((u) => u.role === 'inmate');

  function handleSubmit(e) {
    e.preventDefault();
    approveContact({ variables: form });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Contacts approuvés</h1>
        <p className="text-slate-400 text-sm mt-1">Ajouter un contact téléphonique approuvé pour un détenu</p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Nouveau contact</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Détenu</label>
            <select className="input" value={form.inmateId} onChange={(e) => setForm({ ...form, inmateId: e.target.value })} required>
              <option value="">Sélectionner un détenu</option>
              {inmates.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom du contact</label>
            <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Prénom Nom" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Téléphone</label>
            <input className="input" type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+33 6 00 00 00 00" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Relation</label>
            <input className="input" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} placeholder="Épouse, Parent, Avocat…" required />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">
              {loading ? 'Enregistrement…' : 'Approuver le contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
