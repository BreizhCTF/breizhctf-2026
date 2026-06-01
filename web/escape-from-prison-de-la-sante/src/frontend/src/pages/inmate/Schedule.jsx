import { useQuery } from '@apollo/client';
import { Clock } from 'lucide-react';
import { PRISON_EVENTS } from '../../graphql/queries';
import ScheduleTimeline from '../../components/ScheduleTimeline';

export default function Schedule() {
  const { data } = useQuery(PRISON_EVENTS);
  const events = data?.prisonEvents ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Emploi du Temps</h1>
        <p className="text-slate-400 text-sm mt-1">Planning quotidien de l'établissement</p>
      </div>

      {events.length === 0 ? (
        <div className="card text-center py-10">
          <Clock size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Aucun événement programmé</p>
        </div>
      ) : (
        <div className="card">
          <ScheduleTimeline events={events} />
        </div>
      )}
    </div>
  );
}
