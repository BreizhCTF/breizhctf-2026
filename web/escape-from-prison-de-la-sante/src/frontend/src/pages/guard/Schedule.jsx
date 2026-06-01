import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Clock, Plus, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { PRISON_EVENTS, USERS, EVENT_ATTENDANCE } from '../../graphql/queries';
import { CREATE_PRISON_EVENT, MARK_ATTENDANCE } from '../../graphql/mutations';
import ScheduleTimeline from '../../components/ScheduleTimeline';

export default function GuardSchedule() {
  const { data: eventsData, refetch } = useQuery(PRISON_EVENTS);
  const { data: usersData } = useQuery(USERS);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', eventTime: '', eventType: 'roll_call', recurring: true });

  const events = eventsData?.prisonEvents ?? [];
  const inmates = usersData?.users ?? [];

  const { data: attendanceData, refetch: refetchAttendance } = useQuery(EVENT_ATTENDANCE, {
    variables: { eventId: selectedEvent },
    skip: !selectedEvent,
  });
  const attendance = attendanceData?.eventAttendance ?? [];

  const [createEvent] = useMutation(CREATE_PRISON_EVENT, {
    onCompleted: () => { toast.success('Événement créé'); setShowForm(false); setForm({ name: '', description: '', eventTime: '', eventType: 'roll_call', recurring: true }); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [markAttendance] = useMutation(MARK_ATTENDANCE, {
    onCompleted: () => { toast.success('Présence mise à jour'); refetchAttendance(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Gestion du Planning</h1>
          <p className="text-slate-400 text-sm mt-1">Créez des événements et suivez la présence</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
          <Plus size={14} /> Nouvel événement
        </button>
      </div>

      {showForm && (
        <div className="card mb-5">
          <form onSubmit={(e) => {
            e.preventDefault();
            createEvent({ variables: form });
          }} className="space-y-3">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom de l'événement" />
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
            <div className="grid grid-cols-2 gap-3">
              <input type="time" className="input" value={form.eventTime} onChange={(e) => setForm({ ...form, eventTime: e.target.value })} />
              <select className="input" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
                <option value="roll_call">Appel</option>
                <option value="meal">Repas</option>
                <option value="exercise">Exercice</option>
                <option value="lockdown">Confinement</option>
                <option value="activity">Activité</option>
                <option value="special">Spécial</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Créer</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card">
          <div className="section-label mb-4">Planning du jour</div>
          {events.length === 0 ? (
            <div className="text-center py-6">
              <Clock size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucun événement</p>
            </div>
          ) : (
            <div>
              <ScheduleTimeline events={events} />
              <div className="mt-4 space-y-1">
                {events.map((e) => (
                  <button key={e.id} onClick={() => setSelectedEvent(e.id)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${selectedEvent === e.id ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-slate-700 text-slate-400'}`}
                  >
                    Pointer : {e.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {selectedEvent && (
          <div className="card">
            <div className="section-label mb-4">Présence</div>
            <div className="space-y-2">
              {inmates.map((inmate) => {
                const att = attendance.find((a) => a.inmate?.id === inmate.id);
                return (
                  <div key={inmate.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                    <div className="text-sm">{inmate.username}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAttendance({ variables: { eventId: selectedEvent, inmateId: inmate.id, present: true } })}
                        className={`p-1.5 rounded ${att?.present === true ? 'bg-green-500/20 text-green-400' : 'text-slate-500 hover:text-green-400'}`}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => markAttendance({ variables: { eventId: selectedEvent, inmateId: inmate.id, present: false } })}
                        className={`p-1.5 rounded ${att?.present === false ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-red-400'}`}
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
