const React = require('react');
const { renderToBuffer, Font } = require('@react-pdf/renderer');
const path = require('path');

Font.registerHyphenationCallback(word => [word]);

const TermoCancelamento = require(path.join(__dirname, '../template/TermoCancelamento'));

function normalizeAssoc(associacao) {
  const s = String(associacao || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s.includes('APROVAUTO')) return 'APROVAUTO';
  if (s.includes('CONEXAO') || s.includes('CONEXÃO')) return 'CONEXAO';
  return null;
}

async function generateDocs(data) {
  const vars = {
    NOME:      data.associado   || '',
    CPF:       data.cpfCnpj     || '',
    PLACA:     data.placaChassi || '',
    PLACA_TOP: data.placaTop    || '',
    MOTIVO:    data.motivoCategoria && data.motivoCategoria !== '-' ? data.motivoCategoria : '',
    USER:      data.usuario     || '',
  };

  const nomeSanitized  = (data.associado   || 'SEM_NOME').replace(/[/\\?%*:|"<>]/g, '-').trim();
  const placaSanitized = (data.placaChassi || 'SEM_PLACA').replace(/[/\\?%*:|"<>]/g, '-').trim();

  const assocKey = normalizeAssoc(data.associacao);
  const results  = [];

  if (assocKey) {
    const buffer = await renderToBuffer(
      React.createElement(TermoCancelamento, { ...vars, ASSOCIACAO: assocKey, TIPO: 'CANCELAMENTO' })
    );
    results.push({ name: `${nomeSanitized} - ${placaSanitized}.pdf`, buffer });
  }

  if (data.rastreador === 'TOP' && vars.PLACA_TOP && assocKey) {
    const buffer = await renderToBuffer(
      React.createElement(TermoCancelamento, { ...vars, ASSOCIACAO: assocKey, TIPO: 'TOP' })
    );
    results.push({ name: `${nomeSanitized} - ${placaSanitized} - TOP.pdf`, buffer });
  }

  return results;
}

module.exports = { generateDocs };
