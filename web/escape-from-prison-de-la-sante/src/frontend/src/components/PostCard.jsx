import { useState } from 'react';
import { Heart, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { timeAgo } from '../lib/format';

function Avatar({ username }) {
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-amber-600', 'bg-red-600', 'bg-teal-600'];
  const idx = username.charCodeAt(0) % colors.length;
  return (
    <div className={`w-8 h-8 rounded-full ${colors[idx]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {username.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function PostCard({ post, myId, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  const handleComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onComment(post.id, newComment.trim());
    setNewComment('');
  };

  return (
    <div className="card">
      <div className="flex gap-3">
        <Avatar username={post.author.username} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm">{post.author.username}</span>
            <span className="text-xs text-slate-500">{timeAgo(post.createdAt)}</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => onLike(post.id)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <Heart size={13} className={post.likedByMe ? 'fill-red-400 text-red-400' : ''} />
              {post.likes}
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
            >
              <MessageCircle size={13} />
              {post.comments?.length ?? 0}
              {showComments ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          </div>

          {showComments && (
            <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
              {post.comments?.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar username={c.user.username} />
                  <div className="flex-1 bg-slate-700/50 rounded-lg px-3 py-2">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold">{c.user.username}</span>
                      <span className="text-xs text-slate-600">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-slate-300 text-xs">{c.content}</p>
                  </div>
                </div>
              ))}
              <form onSubmit={handleComment} className="flex gap-2 mt-2">
                <input
                  className="input text-xs flex-1 py-1.5"
                  placeholder="Répondre…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">Envoyer</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
