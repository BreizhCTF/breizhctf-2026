import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import { SOLITARY_CONFINEMENTS, USERS } from '../../graphql/queries';
import { RELEASE_SOLITARY } from '../../graphql/mutations';
import { formatDate, formatCountdown } from '../../lib/format';

export default function GuardSolitary() {
  const { data, refetch } = useQuery(SOLITARY_CONFINEMENTS, { variables: { active: true }, pollInterval: 30000 });
  const [releaseSolitary] = useMutation(RELEASE_SOLITARY, {
    refetchQueries: [{ query: SOLITARY_CONFINEMENTS, variables: { active: true } }, { query: USERS }],
    onCompleted: () => { toast.success('Détenu libéré du quartier d\'isolement'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const confinements = data?.solitaryConfinements ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Quartier d'isolement</h1>
        <p className="text-slate-400 text-sm mt-1">Détenus en mesure d'isolement disciplinaire</p>
      </div>

      {confinements.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <p className="text-slate-400">Aucun détenu en isolement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {confinements.map((conf) => (
            <div key={conf.id} className="card border-l-4 border-red-500">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-red-400 mb-1">
                    {conf.inmate?.username}
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{conf.reason}</p>
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>Début : <span className="font-mono">{formatDate(conf.startedAt)}</span></span>
                    <span>Fin : <span className="font-mono">{formatDate(conf.endsAt)}</span></span>
                    <span>Durée : <span className="font-mono">{conf.durationDays}j</span></span>
                  </div>
                  <div className="mt-2 text-sm font-mono text-amber-400">
                    Restant : {formatCountdown(conf.endsAt)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Ordonné par : {conf.orderedBy?.username}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Libérer ${conf.inmate?.username} de l'isolement ?`))
                      releaseSolitary({ variables: { confinementId: conf.id } });
                  }}
                  className="btn btn-success btn-sm flex-shrink-0"
                >
                  Libérer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
