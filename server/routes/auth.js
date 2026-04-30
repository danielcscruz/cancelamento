const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const db = require('../db');
const { log } = require('../services/logger');

const adminOnly = [authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
  next();
}];

const JWT_SECRET = process.env.JWT_SECRET || 'cancelamento-secret-key';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  try {
    const { rows } = await db.query('SELECT * FROM users WHERE LOWER("email") = LOWER($1)', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, role' });
  if (!['admin', 'usuario'].includes(role)) return res.status(400).json({ error: 'Role inválido' });

  try {
    const { rows } = await db.query('SELECT id FROM users WHERE LOWER("email") = LOWER($1)', [email]);
    if (rows.length > 0) return res.status(409).json({ error: 'Email já cadastrado' });

    const initials = name.trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join('');
    const hashed = await bcrypt.hash(password, 10);
    const id = Date.now().toString();
    await db.query(
      `INSERT INTO users ("id","name","email","password","role","initials") VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, name, email, hashed, role, initials]
    );
    await log({
      userId: req.user.id, userName: req.user.name,
      action: 'CREATE', entity: 'user', entityId: id,
      detail: `Usuário criado: ${name} (${email}) — perfil: ${role}`,
    });
    res.status(201).json({ id, name, email, role, initials });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT "id","name","email","role","initials" FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/password', adminOnly, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const { rowCount } = await db.query('UPDATE users SET "password" = $1 WHERE "id" = $2', [hashed, req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    await log({
      userId: req.user.id, userName: req.user.name,
      action: 'PASSWORD', entity: 'user', entityId: req.params.id,
      detail: `Senha alterada pelo admin`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM users WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    await log({
      userId: req.user.id, userName: req.user.name,
      action: 'DELETE', entity: 'user', entityId: req.params.id,
      detail: `Usuário excluído`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
