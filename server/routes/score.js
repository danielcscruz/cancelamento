const express = require('express');
const router = express.Router();
const { buscarAssociadoDetalhado } = require('../services/associadoDetalhado');

router.get('/', async (req, res) => {
  try {
    const { cpf, associacao } = req.query;
    if (!cpf || !associacao) {
      return res.status(400).json({ error: 'Parâmetros cpf e associacao são obrigatórios' });
    }

    const detalhado = await buscarAssociadoDetalhado(associacao, cpf);
    res.json(detalhado);
  } catch (err) {
    console.error('[Score]', err.message);
    if (err.semResultado || err.status === 404) {
      return res.status(404).json({ error: 'Associado não encontrado para o CPF informado.' });
    }
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
