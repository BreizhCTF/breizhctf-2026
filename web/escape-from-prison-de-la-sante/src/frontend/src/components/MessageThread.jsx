import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { timeAgo } from '../lib/format';

export default function MessageThread({ messages, myId, onSend }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">Aucun message</div>
        )}
        {messages.map((m) => {
          const isMine = String(m.sender.id) === String(myId);
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                isMine
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-slate-700 text-slate-200 rounded-bl-sm'
              }`}>
                <p>{m.content}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-blue-200' : 'text-slate-500'}`}>
                  {timeAgo(m.sentAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-slate-700">
        <input
          className="input flex-1 text-sm"
          placeholder="Message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm px-3">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
