import { useQuery, useMutation } from '@apollo/client';
import { GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { PROGRAMS, MY_ENROLLMENTS } from '../../graphql/queries';
import { ENROLL_IN_PROGRAM, COMPLETE_SESSION } from '../../graphql/mutations';
import ProgramCard from '../../components/ProgramCard';

export default function Programs() {
  const { data: programsData } = useQuery(PROGRAMS);
  const { data: enrollmentsData, refetch } = useQuery(MY_ENROLLMENTS);

  const programs = programsData?.programs ?? [];
  const enrollments = enrollmentsData?.myEnrollments ?? [];

  const [enroll] = useMutation(ENROLL_IN_PROGRAM, {
    onCompleted: () => { toast.success('Inscrit au programme'); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [complete] = useMutation(COMPLETE_SESSION, {
    onCompleted: (data) => {
      const e = data.completeSession;
      if (e.status === 'completed') toast.success('Programme terminé ! Bonus conduite appliqué.');
      else toast.success('Session complétée');
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Programmes de Réhabilitation</h1>
        <p className="text-slate-400 text-sm mt-1">Inscrivez-vous aux programmes pour améliorer votre conduite et vos chances de permission</p>
      </div>

      {programs.length === 0 ? (
        <div className="card text-center py-10">
          <GraduationCap size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Aucun programme disponible</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map((p) => {
            const enrollment = enrollments.find((e) => e.program.id === p.id && e.status !== 'dropped');
            return (
              <ProgramCard
                key={p.id}
                program={p}
                enrollment={enrollment}
                onEnroll={(id) => enroll({ variables: { programId: id } })}
                onComplete={(id) => complete({ variables: { enrollmentId: id } })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
