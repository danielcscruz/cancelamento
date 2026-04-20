const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');

const DB_PATH = path.join(__dirname, '../database.json');

function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

router.use(authMiddleware);

// List — admin sees all, usuario sees only their own
router.get('/', (req, res) => {
  const all = readDB();
  if (req.user.role === 'admin') return res.json(all);
  res.json(all.filter((r) => r.usuario === req.user.name));
});

// Create — both roles; usuario field locked to authenticated user
router.post('/', (req, res) => {
  const records = readDB();
  const record = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...req.body,
    usuario: req.user.name,
  };
  records.push(record);
  writeDB(records);
  res.status(201).json(record);
});

// Update — admin only
router.put('/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
  const records = readDB();
  const idx = records.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  records[idx] = { ...records[idx], ...req.body };
  writeDB(records);
  res.json(records[idx]);
});

// Delete — admin only
router.delete('/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
  const records = readDB();
  const filtered = records.filter((r) => r.id !== req.params.id);
  if (filtered.length === records.length) return res.status(404).json({ error: 'Not found' });
  writeDB(filtered);
  res.json({ success: true });
});

module.exports = router;
