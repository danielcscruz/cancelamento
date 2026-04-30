const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const db = require('../db');

const adminOnly = [authMiddleware, (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
  next();
}];

router.get('/', adminOnly, async (req, res) => {
  try {
    const { user, from, to } = req.query;
    const conditions = [];
    const params = [];

    if (user) {
      params.push(user);
      conditions.push(`"user_name" ILIKE $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`"created_at" >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conditions.push(`"created_at" < ($${params.length}::date + interval '1 day')`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT * FROM logs ${where} ORDER BY "created_at" DESC LIMIT 500`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
