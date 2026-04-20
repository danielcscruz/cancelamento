const express = require('express');
const router = express.Router();
const { generateDocs } = require('../services/docGenerator');

router.post('/', async (req, res) => {
  try {
    const docs = await generateDocs(req.body);

    if (docs.length === 0) {
      return res.status(400).json({ error: 'Nenhum template encontrado para os parâmetros fornecidos.' });
    }

    res.json({
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
