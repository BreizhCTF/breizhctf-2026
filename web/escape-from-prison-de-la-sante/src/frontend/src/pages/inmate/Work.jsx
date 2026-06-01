import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import { WORK_JOBS, MY_WALLET } from '../../graphql/queries';
import { START_WORK } from '../../graphql/mutations';
import { formatCurrency } from '../../lib/format';
import WorkJobCard from '../../components/WorkJobCard';

export default function Work() {
  const { data, loading: queryLoading } = useQuery(WORK_JOBS, { pollInterval: 15000 });
  const [startWork, { loading: mutLoading }] = useMutation(START_WORK, {
    refetchQueries: [{ query: WORK_JOBS }, { query: MY_WALLET }],
  });
  const [activeJobId, setActiveJobId] = useState(null);

  async function handleStartWork(jobId) {
    setActiveJobId(jobId);
    try {
      const { data } = await startWork({ variables: { jobId } });
      const session = data?.startWork;
      if (session) {
        toast.success(`Travail terminé ! Gain : ${formatCurrency(session.earnings)}`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActiveJobId(null);
    }
  }

  const jobs = data?.workJobs ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Postes de travail</h1>
        <p className="text-slate-400 text-sm mt-1">Travaillez pour gagner des crédits et améliorer votre quotidien</p>
      </div>

      {queryLoading ? (
        <div className="text-slate-400 text-sm">Chargement…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map((job) => (
            <WorkJobCard
              key={job.id}
              job={job}
              onStartWork={handleStartWork}
              loading={mutLoading && activeJobId === job.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
