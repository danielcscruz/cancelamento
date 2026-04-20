const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execFileAsync = promisify(execFile);

const TEMPLATE_DIR = path.join(__dirname, '../../template');

const LIBREOFFICE_PATHS = [
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/usr/bin/libreoffice',
  '/usr/local/bin/libreoffice',
];

function findLibreOffice() {
  for (const p of LIBREOFFICE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('LibreOffice não encontrado. Instale com: brew install --cask libreoffice');
}

const TEMPLATE_MAP = {
  APROVAUTO: 'Termo - APROVAUTO.docx',
  CONEXAO: 'Termo - CONEXÃO.docx',
};

const TRACKER_TEMPLATE_MAP = {
  APROVAUTO: 'Termo - TOP APROVAUTO.docx',
  CONEXAO: 'Termo - TOP CONEXAO.docx',
};

function renderDocx(templateFile, variables) {
  const templatePath = path.join(TEMPLATE_DIR, templateFile);
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  });
  doc.render(variables);
  return doc.getZip().generate({ type: 'nodebuffer' });
}

async function docxBufferToPdf(docxBuffer) {
  const soffice = findLibreOffice();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'termo-'));
  const docxPath = path.join(tmpDir, 'document.docx');

  try {
    fs.writeFileSync(docxPath, docxBuffer);

    await execFileAsync(soffice, [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', tmpDir,
      docxPath,
    ]);

    const pdfPath = path.join(tmpDir, 'document.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    return pdfBuffer;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function generateDocs(data) {
  const now = new Date();
  const DIA = String(now.getDate()).padStart(2, '0');
  const MES = String(now.getMonth() + 1).padStart(2, '0');
  const ANO = String(now.getFullYear());

  const motivoParts = [data.motivoCategoria, data.motivoDetalhe].filter(
    (p) => p && p !== '-'
  );

  const variables = {
    NOME: data.associado || '',
    CPF: data.cpfCnpj || '',
    PLACA: data.placaChassi || '',
    PLACA_TOP: data.placaTop || '',
    MOTIVO: motivoParts.join(' — '),
    USER: data.usuario || '',
    DIA,
    MES,
    ANO,
  };

  const nomeSanitized = (data.associado || 'SEM_NOME').replace(/[/\\?%*:|"<>]/g, '-').trim();
  const placaSanitized = (data.placaChassi || 'SEM_PLACA').replace(/[/\\?%*:|"<>]/g, '-').trim();

  const results = [];

  const mainTemplate = TEMPLATE_MAP[data.associacao];
  if (mainTemplate) {
    const docxBuffer = renderDocx(mainTemplate, variables);
    const pdfBuffer = await docxBufferToPdf(docxBuffer);
    results.push({ name: `${nomeSanitized} - ${placaSanitized}.pdf`, buffer: pdfBuffer });
  }

  if (data.rastreador === 'TOP') {
    const trackerTemplate = TRACKER_TEMPLATE_MAP[data.associacao];
    if (trackerTemplate) {
      const docxBuffer = renderDocx(trackerTemplate, variables);
      const pdfBuffer = await docxBufferToPdf(docxBuffer);
      results.push({ name: `${nomeSanitized} - ${placaSanitized} - TOP.pdf`, buffer: pdfBuffer });
    }
  }

  return results;
}

module.exports = { generateDocs };
