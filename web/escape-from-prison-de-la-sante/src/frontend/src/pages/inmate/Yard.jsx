import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Heart, MessageSquare, Send, Users, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_BLOC, INMATES_IN_BLOC, MY_MESSAGES } from '../../graphql/queries';
import { CREATE_POST, LIKE_POST, CREATE_COMMENT, SEND_MESSAGE } from '../../graphql/mutations';
import { timeAgo } from '../../lib/format';

function PostCard({ post, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  function handleComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    onComment(post.id, comment);
    setComment('');
    setShowComments(true);
  }

  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-sm font-bold flex-shrink-0">
          {post.author.username[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm">{post.author.username}</div>
          <div className="text-xs text-slate-500">{timeAgo(post.createdAt)}</div>
        </div>
      </div>

      <p className="text-sm text-slate-200 mb-4 leading-relaxed">{post.content}</p>

      <div className="flex items-center gap-4 text-xs text-slate-400">
        <button
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 hover:text-red-400 transition-colors"
        >
          <Heart size={14} />
          <span>{post.likes}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 hover:text-blue-400 transition-colors"
        >
          <MessageSquare size={14} />
          <span>{post.comments.length} commentaire{post.comments.length !== 1 ? 's' : ''}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
          {post.comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                {c.user.username[0].toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-300">{c.user.username} </span>
                <span className="text-xs text-slate-400">{c.content}</span>
              </div>
            </div>
          ))}
          <form onSubmit={handleComment} className="flex gap-2 mt-2">
            <input
              className="input text-xs flex-1 py-1.5"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire…"
            />
            <button type="submit" className="btn btn-ghost btn-sm p-2"><Send size={12} /></button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function Yard() {
  const { data: blocData, refetch } = useQuery(MY_BLOC, { pollInterval: 30000 });
  const { data: inmatesData } = useQuery(INMATES_IN_BLOC);
  const [createPost, { loading: postLoading }] = useMutation(CREATE_POST, { onCompleted: () => { refetch(); setContent(''); }, onError: (e) => toast.error(e.message) });
  const [likePost] = useMutation(LIKE_POST, { onCompleted: () => refetch() });
  const [createComment] = useMutation(CREATE_COMMENT, { onCompleted: () => refetch() });

  const [content, setContent] = useState('');
  const [tab, setTab] = useState('yard');

  const bloc = blocData?.myBloc;
  const posts = bloc?.posts ?? [];
  const announcements = bloc?.announcements ?? [];

  function handlePost(e) {
    e.preventDefault();
    if (!content.trim() || !bloc) return;
    createPost({ variables: { content, blocId: bloc.id } });
  }

  if (bloc?.isLocked) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center py-20 text-center">
        <Lock size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-red-400 mb-2">Cour fermée</h2>
        <p className="text-slate-400">{bloc.lockdownReason || 'Confinement disciplinaire en cours.'}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">La Cour</h1>
        <p className="text-slate-400 text-sm mt-1">{bloc?.name} · Espace social du bloc</p>
      </div>

      <div className="flex gap-2 mb-5">
        {['yard', 'announcements'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>
            {t === 'yard' ? 'Publications' : 'Annonces'}
          </button>
        ))}
      </div>

      {tab === 'yard' && (
        <>
          <div className="card mb-5">
            <form onSubmit={handlePost}>
              <textarea
                className="input resize-none mb-3"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Partagez quelque chose avec votre bloc…"
              />
              <button type="submit" disabled={postLoading || !content.trim()} className="btn btn-primary btn-sm disabled:opacity-50">
                <Send size={14} />
                Publier
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="card flex flex-col items-center py-10 text-center">
                <Users size={32} className="text-slate-600 mb-2" />
                <p className="text-slate-400 text-sm">Aucune publication dans ce bloc</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={(id) => likePost({ variables: { postId: id } })}
                  onComment={(postId, content) => createComment({ variables: { content, postId } })}
                />
              ))
            )}
          </div>
        </>
      )}

      {tab === 'announcements' && (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-slate-400 text-sm">Aucune annonce</p>
            </div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className={`card border-l-4 ${
                a.priority === 'urgent' ? 'border-red-500' :
                a.priority === 'high' ? 'border-orange-500' :
                a.priority === 'normal' ? 'border-blue-500' : 'border-slate-600'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">{a.title}</h3>
                    <p className="text-slate-400 text-sm">{a.content}</p>
                    <div className="mt-2 text-xs text-slate-500">
                      {a.author.username} · {timeAgo(a.createdAt)}
                    </div>
                  </div>
                  <span className={`badge ml-3 flex-shrink-0 ${
                    a.priority === 'urgent' ? 'badge-red' :
                    a.priority === 'high' ? 'badge-orange' :
                    a.priority === 'normal' ? 'badge-blue' : 'badge-gray'
                  }`}>{a.priority}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
