import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { BookOpen, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { BOOKS, MY_LOANS } from '../../graphql/queries';
import { BORROW_BOOK, RETURN_BOOK } from '../../graphql/mutations';
import { formatDate } from '../../lib/format';

const GENRES = [null, 'roman', 'policier', 'science-fiction', 'histoire', 'biographie', 'philosophie', 'droit'];

export default function Library() {
  const [genre, setGenre] = useState(null);
  const { data: booksData } = useQuery(BOOKS, { variables: { genre } });
  const { data: loansData, refetch } = useQuery(MY_LOANS);
  const [borrowBook, { loading: borrowLoading }] = useMutation(BORROW_BOOK, {
    onCompleted: () => { toast.success('Livre emprunté pour 14 jours'); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [returnBook] = useMutation(RETURN_BOOK, {
    onCompleted: () => { toast.success('Livre rendu'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const books = booksData?.books ?? [];
  const loans = loansData?.myLoans ?? [];
  const activeLoans = loans.filter((l) => l.status === 'active');
  const borrowedBookIds = new Set(activeLoans.map((l) => l.book.id));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Bibliothèque</h1>
        <p className="text-slate-400 text-sm mt-1">Empruntez des livres pour une durée de 14 jours</p>
      </div>

      {activeLoans.length > 0 && (
        <div className="card mb-6">
          <div className="section-label mb-3">Emprunts en cours</div>
          <div className="space-y-2">
            {activeLoans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div>
                  <div className="font-semibold text-sm">{loan.book.title}</div>
                  <div className="text-xs text-slate-400">{loan.book.author}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">À rendre le</div>
                    <div className="font-mono text-sm text-amber-400">{formatDate(loan.dueDate)}</div>
                  </div>
                  <button
                    onClick={() => returnBook({ variables: { loanId: loan.id } })}
                    className="btn btn-ghost btn-sm"
                  >
                    <RotateCcw size={14} />
                    Rendre
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {GENRES.map((g) => (
          <button key={String(g)} onClick={() => setGenre(g)} className={`btn btn-sm ${genre === g ? 'btn-primary' : 'btn-ghost'}`}>
            {g ?? 'Tous'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {books.map((book) => {
          const isBorrowed = borrowedBookIds.has(book.id);
          return (
            <div key={book.id} className="card flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm leading-tight">{book.title}</h3>
                  <span className="badge badge-gray ml-2 flex-shrink-0">{book.genre}</span>
                </div>
                <p className="text-slate-400 text-xs mb-1">{book.author}</p>
                <p className="text-slate-500 text-xs mb-3 line-clamp-3">{book.description}</p>
                <span className={`text-xs ${book.availableCopies > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {book.availableCopies} exemplaire{book.availableCopies !== 1 ? 's' : ''} disponible{book.availableCopies !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="mt-4">
                {isBorrowed ? (
                  <div className="text-xs text-center text-green-400 font-semibold">✓ Emprunté</div>
                ) : (
                  <button
                    onClick={() => borrowBook({ variables: { bookId: book.id } })}
                    disabled={book.availableCopies === 0 || borrowLoading}
                    className="btn btn-primary btn-sm w-full justify-center disabled:opacity-50"
                  >
                    <BookOpen size={13} />
                    {book.availableCopies === 0 ? 'Indisponible' : 'Emprunter'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
