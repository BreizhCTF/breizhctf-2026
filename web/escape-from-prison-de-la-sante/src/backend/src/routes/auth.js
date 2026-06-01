import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiants requis' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, role, password_hash FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400000,
    });

    return res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Adresse e-mail requise' });
  }

  try {
    const result = await pool.query(
      'SELECT id, role FROM users WHERE email = $1',
      [email]
    );

    const account = result.rows[0];
    if (account && account.role !== 'inmate') {
      const token = crypto.randomBytes(20).toString('hex');
      const expires = new Date(Date.now() + 3600 * 1000); // 1 heure

      await pool.query(
        'UPDATE users SET token = $1, token_expires = $2 WHERE id = $3',
        [token, expires, account.id]
      );

      // Todo: Send email with reset link containing the token
    }

    // Réponse identique qu'un compte existe ou non (évite l'énumération)
    return res.json({
      success: true,
      message: "Si un compte est associé à cette adresse, un lien de réinitialisation vous a été envoyé.",
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, role FROM users
       WHERE token = $1
         AND (token_expires IS NULL OR token_expires > NOW())`,
      [token]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, token = NULL, token_expires = NULL WHERE id = $2',
      [hash, user.id]
    );

    return res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
