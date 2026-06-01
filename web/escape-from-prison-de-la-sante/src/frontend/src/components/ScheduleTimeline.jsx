const typeColors = {
  roll_call: 'bg-blue-500',
  meal: 'bg-green-500',
  exercise: 'bg-amber-500',
  lockdown: 'bg-red-500',
  activity: 'bg-purple-500',
  special: 'bg-pink-500',
};

const typeLabels = {
  roll_call: 'Appel',
  meal: 'Repas',
  exercise: 'Exercice',
  lockdown: 'Confinement',
  activity: 'Activité',
  special: 'Spécial',
};

export default function ScheduleTimeline({ events }) {
  const sorted = [...events].sort((a, b) => a.eventTime.localeCompare(b.eventTime));

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />
      <div className="space-y-4">
        {sorted.map((event) => (
          <div key={event.id} className="relative flex items-start gap-4 pl-10">
            <div className={`absolute left-2.5 w-3 h-3 rounded-full ${typeColors[event.eventType] || 'bg-slate-500'} ring-2 ring-slate-800`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-200">{event.eventTime?.slice(0, 5)}</span>
                <span className={`badge text-xs ${
                  event.eventType === 'lockdown' ? 'badge-red' :
                  event.eventType === 'meal' ? 'badge-green' : 'badge-blue'
                }`}>{typeLabels[event.eventType] || event.eventType}</span>
              </div>
              <div className="text-sm font-medium mt-0.5">{event.name}</div>
              {event.description && <div className="text-xs text-slate-400 mt-0.5">{event.description}</div>}
              {event.bloc && <div className="text-xs text-slate-500 mt-0.5">{event.bloc.name}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
