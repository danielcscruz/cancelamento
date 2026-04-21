const express = require('express');
const router = express.Router();
const { buscarAssociado } = require('../services/hinovaService');

const SITUACOES_ATIVAS = new Set(['ATIVO', 'INADIMPLENTE']);

router.get('/associado', async (req, res) => {
  try {
    const data = await buscarAssociado(req.query.cpf);

    const veiculos = (data.veiculos || [])
      .filter((v) => SITUACOES_ATIVAS.has((v.situacao || '').toUpperCase()))
      .map((v) => ({ placa: v.placa, chassi: v.chassi, situacao: v.situacao }));

    res.json({ nome: data.nome, veiculos });
  } catch (err) {
    console.error('[Hinova]', err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
