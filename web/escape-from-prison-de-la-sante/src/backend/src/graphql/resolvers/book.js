import { requireRole } from '../../middleware/auth.js';

export const BookResolver = {};

export const BookLoanResolver = {
  book: async (parent, _, { db }) => {
    const result = await db.query('SELECT * FROM books WHERE id=$1', [parent.book_id]);
    return result.rows[0];
  },
  loanDate: (parent) => parent.loan_date?.toISOString?.()?.split('T')[0] ?? parent.loan_date,
  dueDate: (parent) => parent.due_date?.toISOString?.()?.split('T')[0] ?? parent.due_date,
  returnDate: (parent) => parent.return_date?.toISOString?.()?.split('T')[0] ?? parent.return_date,
};

export const bookQueries = {
  books: async (_, { genre }, { db, user }) => {
    requireRole(user, 'inmate');
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];
    if (genre) {
      params.push(genre);
      query += ` AND genre=$${params.length}`;
    }
    query += ' ORDER BY title';
    const result = await db.query(query, params);
    return result.rows;
  },

  myLoans: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      `SELECT bl.* FROM book_loans bl WHERE bl.inmate_id=$1 ORDER BY bl.loan_date DESC`,
      [user.id]
    );
    return result.rows;
  },
};

export const bookMutations = {
  borrowBook: async (_, { bookId }, { db, user }) => {
    requireRole(user, 'inmate');

    const profile = await db.query(
      'SELECT privileges, is_in_solitary FROM inmate_profiles WHERE user_id=$1',
      [user.id]
    );
    const p = profile.rows[0];
    if (!p) throw new Error('Profil introuvable');
    if (p.is_in_solitary) throw new Error('Accès à la bibliothèque non autorisé en quartier d\'isolement');
    const priv = typeof p.privileges === 'string' ? JSON.parse(p.privileges) : p.privileges;
    if (!priv?.library) throw new Error('Accès à la bibliothèque suspendu');

    const existing = await db.query(
      'SELECT * FROM book_loans WHERE inmate_id=$1 AND book_id=$2 AND status=$3',
      [user.id, bookId, 'active']
    );
    if (existing.rows[0]) throw new Error('Vous avez déjà emprunté ce livre');

    const book = await db.query(
      'SELECT * FROM books WHERE id=$1 AND available_copies > 0',
      [bookId]
    );
    if (!book.rows[0]) throw new Error('Livre introuvable ou indisponible');

    const loanDate = new Date();
    const dueDate = new Date(loanDate);
    dueDate.setDate(dueDate.getDate() + 14);

    const result = await db.query(
      `INSERT INTO book_loans (book_id, inmate_id, loan_date, due_date, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [bookId, user.id, loanDate, dueDate]
    );

    await db.query(
      'UPDATE books SET available_copies = available_copies - 1 WHERE id=$1',
      [bookId]
    );

    return result.rows[0];
  },

  returnBook: async (_, { loanId }, { db, user }) => {
    requireRole(user, 'inmate');

    const loan = await db.query(
      'SELECT * FROM book_loans WHERE id=$1 AND inmate_id=$2 AND status=$3',
      [loanId, user.id, 'active']
    );
    if (!loan.rows[0]) throw new Error('Emprunt introuvable');

    const returnDate = new Date();
    const result = await db.query(
      `UPDATE book_loans SET status='returned', return_date=$1 WHERE id=$2 RETURNING *`,
      [returnDate, loanId]
    );

    await db.query(
      'UPDATE books SET available_copies = available_copies + 1 WHERE id=$1',
      [loan.rows[0].book_id]
    );

    return result.rows[0];
  },
};
