import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Send, LogOut, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { GANGS, MY_GANG, GANG_MESSAGES } from '../../graphql/queries';
import { JOIN_GANG, LEAVE_GANG, SEND_GANG_MESSAGE } from '../../graphql/mutations';
import GangCard from '../../components/GangCard';
import { timeAgo } from '../../lib/format';

export default function Gang() {
  const { data: gangsData, refetch: refetchGangs } = useQuery(GANGS);
  const { data: myGangData, refetch: refetchMyGang } = useQuery(MY_GANG);
  const [message, setMessage] = useState('');

  const myGang = myGangData?.myGang;
  const gangs = gangsData?.gangs ?? [];

  const { data: messagesData, refetch: refetchMessages } = useQuery(GANG_MESSAGES, {
    variables: { gangId: myGang?.id },
    skip: !myGang?.id,
    pollInterval: 10000,
  });

  const [joinGang] = useMutation(JOIN_GANG, {
    onCompleted: () => { toast.success('Gang rejoint !'); refetchGangs(); refetchMyGang(); },
    onError: (e) => toast.error(e.message),
  });
  const [leaveGang] = useMutation(LEAVE_GANG, {
    onCompleted: () => { toast.success('Gang quitté'); refetchGangs(); refetchMyGang(); },
    onError: (e) => toast.error(e.message),
  });
  const [sendGangMessage] = useMutation(SEND_GANG_MESSAGE, {
    onCompleted: () => { setMessage(''); refetchMessages(); },
    onError: (e) => toast.error(e.message),
  });

  const messages = messagesData?.gangMessages ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Gangs & Alliances</h1>
        <p className="text-slate-400 text-sm mt-1">Rejoignez un gang pour accéder à la messagerie exclusive</p>
      </div>

      {myGang ? (
        <div className="space-y-5">
          <div className="card border border-amber-500/30">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{myGang.name}</h2>
                <p className="text-slate-400 text-sm mt-1">{myGang.description}</p>
              </div>
              <button onClick={() => leaveGang()} className="btn btn-ghost btn-sm text-red-400">
                <LogOut size={14} /> Quitter
              </button>
            </div>
            <div className="mt-4">
              <div className="section-label mb-2">Membres ({myGang.members?.length})</div>
              <div className="flex flex-wrap gap-2">
                {myGang.members?.map((m) => (
                  <span key={m.id} className={`badge ${m.role === 'leader' ? 'badge-yellow' : m.role === 'lieutenant' ? 'badge-blue' : 'badge-gray'}`}>
                    {m.user.username} ({m.role})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-label mb-4">Messagerie du gang</div>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Aucun message</p>
              ) : (
                [...messages].reverse().map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-mono text-xs font-bold flex-shrink-0">
                      {msg.sender.username[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-300">{msg.sender.username}</span>
                      <span className="text-xs text-slate-500 ml-2">{timeAgo(msg.sentAt)}</span>
                      <p className="text-sm text-slate-200">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendGangMessage({ variables: { gangId: myGang.id, content: message } }); }} className="flex gap-2">
              <input className="input flex-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message au gang…" />
              <button type="submit" className="btn btn-primary btn-sm"><Send size={14} /></button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {gangs.length === 0 ? (
            <div className="card text-center py-10">
              <Users size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucun gang disponible</p>
            </div>
          ) : (
            gangs.map((g) => (
              <GangCard key={g.id} gang={g} isMember={false} onJoin={(id) => joinGang({ variables: { gangId: id } })} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
