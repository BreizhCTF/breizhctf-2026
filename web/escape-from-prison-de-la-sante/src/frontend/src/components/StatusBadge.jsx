const STATUS_MAP = {
  // Visit / Leave
  pending:     'badge-yellow',
  approved:    'badge-green',
  denied:      'badge-red',
  completed:   'badge-gray',
  // Incident
  open:        'badge-yellow',
  resolved:    'badge-green',
  closed:      'badge-gray',
  // Medical
  scheduled:   'badge-blue',
  cancelled:   'badge-red',
  // Inmate
  incarcerated:'badge-blue',
  released:    'badge-green',
  transferred: 'badge-orange',
  infirmary:   'badge-red',
  // Generic
  active:      'badge-green',
  inactive:    'badge-gray',
};

const LABEL_MAP = {
  pending:     'En attente',
  approved:    'Approuvé',
  denied:      'Refusé',
  completed:   'Terminé',
  open:        'Ouvert',
  resolved:    'Résolu',
  closed:      'Classé',
  scheduled:   'Planifié',
  cancelled:   'Annulé',
  incarcerated:'Incarcéré',
  released:    'Libéré',
  transferred: 'Transféré',
  infirmary:   'Infirmerie',
  active:      'Actif',
  inactive:    'Inactif',
};

export default function StatusBadge({ status, className = '' }) {
  const cls = STATUS_MAP[status] ?? 'badge-gray';
  const label = LABEL_MAP[status] ?? status;
  return <span className={`badge ${cls} ${className}`}>{label}</span>;
}
