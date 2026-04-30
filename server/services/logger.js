const db = require('../db');

async function log({ userId, userName, action, entity, entityId, detail }) {
  try {
    await db.query(
      `INSERT INTO logs ("user_id","user_name","action","entity","entity_id","detail")
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId || null, userName || null, action, entity, entityId || null, detail || null]
    );
  } catch (err) {
    console.error('[logger] Falha ao registrar log:', err.message);
  }
}

module.exports = { log };
