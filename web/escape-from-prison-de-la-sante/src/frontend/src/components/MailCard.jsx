import { Mail, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { timeAgo } from '../lib/format';

const statusBadge = {
  pending: 'badge-yellow',
  delivered: 'badge-green',
  intercepted: 'badge-red',
  read: 'badge-blue',
};

export default function MailCard({ mail, showInmate, onIntercept, onDeliver }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {mail.direction === 'outgoing' ? (
            <ArrowUpRight size={14} className="text-blue-400" />
          ) : (
            <ArrowDownLeft size={14} className="text-green-400" />
          )}
          <span className="font-semibold text-sm">{mail.correspondentName}</span>
        </div>
        <span className={`badge ${statusBadge[mail.status] || 'badge-gray'}`}>{mail.status}</span>
      </div>
      {mail.subject && <div className="text-sm font-medium text-slate-200 mb-1">{mail.subject}</div>}
      <p className="text-xs text-slate-400 line-clamp-3">{mail.content}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">{timeAgo(mail.createdAt)}</span>
        <div className="flex gap-2">
          {showInmate && mail.inmate && (
            <span className="text-xs text-slate-500">{mail.inmate.username}</span>
          )}
          {onIntercept && mail.status === 'pending' && (
            <button onClick={() => onIntercept(mail.id)} className="btn btn-sm text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20">
              Intercepter
            </button>
          )}
          {onDeliver && mail.status === 'pending' && (
            <button onClick={() => onDeliver(mail.id)} className="btn btn-sm text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20">
              Distribuer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
