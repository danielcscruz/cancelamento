const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const db = require('../db');
const { log } = require('../services/logger');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { rows } = req.user.role === 'admin'
      ? await db.query('SELECT * FROM records ORDER BY "createdAt" DESC')
      : await db.query('SELECT * FROM records WHERE "usuario" = $1 ORDER BY "createdAt" DESC', [req.user.name]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const record = {
      id:        uuidv4(),
      createdAt: new Date().toISOString(),
      ...req.body,
      usuario:   req.user.name,
    };
    await db.query(
      `INSERT INTO records
        ("id","createdAt","usuario","dataSolicitacao","associacao","status","associado",
         "consultor","cpfCnpj","placaChassi","cota","tipoVeiculo","rastreador","placaTop",
         "motivoCategoria","motivoDetalhe","boleto","solicitacao")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        record.id, record.createdAt, record.usuario,
        record.dataSolicitacao  || null, record.associacao      || null,
        record.status           || null, record.associado        || null,
        record.consultor        || null, record.cpfCnpj          || null,
        record.placaChassi      || null,
        record.cota != null ? String(record.cota) : null,
        record.tipoVeiculo      || null, record.rastreador       || null,
        record.placaTop         || null, record.motivoCategoria  || null,
        record.motivoDetalhe    || null, record.boleto           || null,
        record.solicitacao      || null,
      ]
    );
    await log({
      userId: req.user.id, userName: req.user.name,
      action: 'CREATE', entity: 'record', entityId: record.id,
      detail: `Termo gerado para ${record.associado || '-'} (${record.associacao || '-'})`,
    });
    res.status(201).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
  try {
    const { rows } = await db.query('SELECT * FROM records WHERE "id" = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const updated = { ...rows[0], ...req.body };
    await db.query(
      `UPDATE records SET
        "dataSolicitacao"=$1,"associacao"=$2,"status"=$3,"associado"=$4,"consultor"=$5,
        "cpfCnpj"=$6,"placaChassi"=$7,"cota"=$8,"tipoVeiculo"=$9,"rastreador"=$10,
        "placaTop"=$11,"motivoCategoria"=$12,"motivoDetalhe"=$13,"boleto"=$14,"solicitacao"=$15
       WHERE "id"=$16`,
      [
        updated.dataSolicitacao  || null, updated.associacao      || null,
        updated.status           || null, updated.associado        || null,
        updated.consultor        || null, updated.cpfCnpj          || null,
        updated.placaChassi      || null,
        updated.cota != null ? String(updated.cota) : null,
        updated.tipoVeiculo      || null, updated.rastreador       || null,
        updated.placaTop         || null, updated.motivoCategoria  || null,
        updated.motivoDetalhe    || null, updated.boleto           || null,
        updated.solicitacao      || null, req.params.id,
      ]
    );
    await log({
      userId: req.user.id, userName: req.user.name,
      action: 'UPDATE', entity: 'record', entityId: req.params.id,
      detail: `Registro atualizado — status: ${updated.status || '-'}, associado: ${updated.associado || '-'}`,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão' });
  try {
    const { rows: found } = await db.query('SELECT * FROM records WHERE "id" = $1', [req.params.id]);
    if (found.length === 0) return res.status(404).json({ error: 'Not found' });
    const r = found[0];
    const { rowCount } = await db.query('DELETE FROM records WHERE "id" = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    await log({
      userId: req.user.id, userName: req.user.name,
      action: 'DELETE', entity: 'record', entityId: req.params.id,
      detail: `Excluído: ${r.associado || '-'} (${r.associacao || '-'}) — ${r.placaChassi || '-'} — motivo: ${r.motivoCategoria || '-'}`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
