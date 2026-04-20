const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');

const adminOnly = [authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
  next();
}];

const JWT_SECRET = process.env.JWT_SECRET || 'cancelamento-secret-key';
const USERS_PATH = path.join(__dirname, '../users.json');

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
}

function writeUsers(data) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(data, null, 2));
}

// Hash any plain-text passwords in the file (runs on every login to handle manual edits)
async function ensureHashed() {
  const users = readUsers();
  let changed = false;
  for (const u of users) {
    if (!u.password.startsWith('$2b$')) {
      u.password = await bcrypt.hash(u.password, 10);
      changed = true;
    }
  }
  if (changed) writeUsers(users);
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  await ensureHashed();

  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });

  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, initials: user.initials };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  res.json({ token, user: payload });
});

// Create user (admin only)
router.post('/users', adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, role' });
  if (!['admin', 'usuario'].includes(role)) return res.status(400).json({ error: 'Role inválido' });

  const users = readUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: 'Email já cadastrado' });

  const initials = name.trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join('');
  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now().toString(), name, email, password: hashed, role, initials };
  users.push(newUser);
  writeUsers(users);

  const { password: _, ...safe } = newUser;
  res.status(201).json(safe);
});

// List users (admin only)
router.get('/users', adminOnly, (req, res) => {
  const users = readUsers().map(({ password: _, ...u }) => u);
  res.json(users);
});

// Delete user (admin only)
router.delete('/users/:id', adminOnly, (req, res) => {
  const users = readUsers();
  const filtered = users.filter((u) => u.id !== req.params.id);
  if (filtered.length === users.length) return res.status(404).json({ error: 'Usuário não encontrado' });
  writeUsers(filtered);
  res.json({ success: true });
});

module.exports = router;
