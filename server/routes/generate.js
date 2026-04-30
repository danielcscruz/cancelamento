const express = require('express');
const router = express.Router();
const { generateDocs } = require('../services/reactPdfGenerator');
const { log } = require('../services/logger');

router.post('/', async (req, res) => {
  try {
    const docs = await generateDocs(req.body);

    if (docs.length === 0) {
      return res.status(400).json({ error: 'Nenhum template encontrado para os parâmetros fornecidos.' });
    }

    await log({
      userId: req.user?.id, userName: req.user?.name,
      action: 'PDF', entity: 'record', entityId: null,
      detail: `PDF gerado: ${docs.map((d) => d.name).join(', ')} — ${req.body.associado || '-'} (${req.body.associacao || '-'})`,
    });

    res.json({
      engine: 'react-pdf',
      docs: docs.map((doc) => ({
        name: doc.name,
        data: doc.buffer.toString('base64'),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
