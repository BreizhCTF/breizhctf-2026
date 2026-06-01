import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: fr });
  } catch {
    return dateStr;
  }
}

export function formatDate(dateStr, fmt = 'dd/MM/yyyy') {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), fmt, { locale: fr });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr) {
  return formatDate(dateStr, 'dd/MM/yyyy HH:mm');
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatCountdown(endsAt) {
  if (!endsAt) return '';
  const now = new Date();
  const end = parseISO(endsAt);
  const diff = end - now;
  if (diff <= 0) return 'Terminé';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}j ${hours}h ${mins}min`;
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${mins} min`;
}

export function conductColor(score) {
  if (score >= 70) return '#22C55E';
  if (score >= 40) return '#F97316';
  return '#EF4444';
}
