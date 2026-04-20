const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const { generateDocs } = require('../services/docGenerator');

router.post('/', async (req, res) => {
  try {
    const docs = await generateDocs(req.body);

    if (docs.length === 0) {
      return res.status(400).json({ error: 'Nenhum template encontrado para os parâmetros fornecidos.' });
    }

    if (docs.length === 1) {
      const doc = docs[0];
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.name)}"`,
      });
      return res.send(doc.buffer);
    }

    // Múltiplos docs → zip
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="termos.zip"',
    });

    const archive = archiver('zip');
    archive.pipe(res);
    for (const doc of docs) {
      archive.append(doc.buffer, { name: doc.name });
    }
    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
