const React = require('react');
const path = require('path');
const { Document, Page, Text, View, Image, StyleSheet } = require('@react-pdf/renderer');

const ASSETS = path.join(__dirname, 'assets');

const TOP_CONFIG = {
  logo:     path.join(ASSETS, 'logo-top.png'),
  nome:     'TOP MONITORAMENTO 24H',
  endereco: 'Rua do Contorno, nº 98 – Jardim Ouro Branco – Barreiras – Bahia',
  cnpj:     'CNPJ 11.464.030/0001-75',
  telefone: '(77) 3613-1183',
  rodape:   'TOP MONITORAMENTO 24H',
};

const ASSOC_CONFIG = {
  APROVAUTO: {
    logo:     path.join(ASSETS, 'logo-aprovauto.png'),
    nome:     'ASSOCIAÇÃO BRASILEIRA DE BENEFÍCIOS',
    endereco: 'Rua do Contorno, nº 98 – Jardim Ouro Branco – Barreiras – Bahia',
    cnpj:     'CNPJ: 11.464.030/0001-75',
    telefone: '(77) 3613-1183',
    rodape:   'APROVAUTO',
    // cada função retorna array de [texto, negrito]
    corpoCancel: (NOME, CPF, PLACA, MOTIVO) => [
      ['Eu, ', false],
      [NOME, true],
      [' - CPF/CNPJ: ', false],
      [CPF, true],
      ['. Solicito cancelamento cadastral do veículo de PLACA/CHASSI: ', false],
      [PLACA, true],
      [' \u2013 MOTIVO: ', false],
      [MOTIVO, true],
      ['. Junto á ', false],
      ['APROVAUTO Associação Brasileira de Benefícios', true],
      [' \u2013 CNPJ nº 11.464.030/0001-75, consciente de que terei de quitar débitos gerados antes da data deste termo. Sendo efetuado esse cancelamento estarei desobrigado a contribuir com despesas provenientes de sinistros que sejam rateados após essa data, no que se refere ao veículo supracitado, ao mesmo tempo em que a ', false],
      ['APROVAUTO', true],
      [' fica completamente isenta da responsabilidade de Proteção Automotiva com relação ao mesmo.', false],
    ],
    corpoTop: (NOME, CPF, PLACA_TOP) => [
      ['Eu, ', false],
      [NOME, true],
      [' - CPF/CNPJ: ', false],
      [CPF, true],
      ['. Solicito o cancelamento do equipamento de rastreador TOP MONITORAMENTO da placa/chassi: ', false],
      [PLACA_TOP, true],
      [', junto à ', false],
      ['APROVAUTO \u2013 Associação Brasileira de Benefícios', true],
      [' \u2013 CNPJ nº 11.464.030/0001-75. Ao ser efetuado este cancelamento, estará desobrigado a contribuir com despesas que sejam geradas após essa data, no que se refere ao veículo supracitado, ao mesmo tempo em que a ', false],
      ['APROVAUTO', true],
      [' fica completamente isenta da responsabilidade da cobertura para FURTO/ROUBO com relação ao mesmo, caso não seja enviado para ', false],
      ['APROVAUTO', true],
      [', o CONTRATO DE ADESÃO/RELATÓRIO DE COMUNICAÇÃO da empresa que fará o rastreamento do veículo, com a desativação do rastreador TOP MONITORAMENTO.', false],
    ],
  },
  CONEXAO: {
    logo:     path.join(ASSETS, 'logo-conexao.png'),
    nome:     'CONEXÃO CLUBE DE BENEFÍCIOS',
    endereco: 'www.conexaoclubedebeneficios.org',
    cnpj:     'CNPJ 33.397.038/0001-07',
    telefone: '0800-960-2020',
    rodape:   'CONEXÃO \u2013 CLUBE DE BENEFÍCIOS',
    corpoCancel: (NOME, CPF, PLACA, MOTIVO) => [
      ['Eu, ', false],
      [NOME, true],
      [' - CPF/CNPJ: ', false],
      [CPF, true],
      ['. Solicito cancelamento cadastral do veículo de PLACA/CHASSI: ', false],
      [PLACA, true],
      [' \u2013 MOTIVO: ', false],
      [MOTIVO, true],
      ['. Junto à ', false],
      ['CONEXÃO \u2013 CLUBE DE BENEFÍCOS', true],
      [' \u2013 CNPJ nº 33.397.038/0001-07, consciente de que terei de quitar débitos gerados antes da data deste termo. Sendo efetuado esse cancelamento estarei desobrigado a contribuir com despesas provenientes de sinistros que sejam rateados após essa data, no que se refere ao veículo supracitado, ao mesmo tempo em que a ', false],
      ['CONEXÃO', true],
      [' fica completamente isenta da responsabilidade de Proteção Automotiva com relação ao mesmo.', false],
    ],
    corpoTop: (NOME, CPF, PLACA_TOP) => [
      ['Eu, ', false],
      [NOME, true],
      [' - CPF/CNPJ: ', false],
      [CPF, true],
      ['. Solicito o cancelamento do equipamento de rastreador TOP MONITORAMENTO da placa/chassi: ', false],
      [PLACA_TOP, true],
      [', junto à ', false],
      ['CONEXÃO \u2013 Clube de Benefícios', true],
      [' \u2013 CNPJ nº 33.397.038/0001-07, ciente que terei que quitar débito gerado antes da data deste termo. Ao ser efetuado este cancelamento, estará desobrigado a contribuir com despesas que sejam geradas após essa data, no que se refere ao veículo supracitado, ao mesmo tempo em que a ', false],
      ['CONEXÃO', true],
      [' fica completamente isenta da responsabilidade da cobertura para FURTO/ROUBO com relação ao mesmo, caso não seja enviado para ', false],
      ['CONEXÃO', true],
      [', o CONTRATO DE ADESÃO/RELATÓRIO DE COMUNICAÇÃO da empresa que fará o rastreamento do veículo, com a desativação do rastreador TOP MONITORAMENTO.', false],
    ],
  },
};

const S = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 12, paddingTop: 20, paddingBottom: 80, paddingLeft: 72, paddingRight: 72 },

  header:      { alignItems: 'center', marginBottom: 10 },
  logo:        { width: 120, height: 60, objectFit: 'contain', marginBottom: 1 },
  logoAssoc:   { width: 150, height: 60, objectFit: 'contain', marginBottom: 1 },
  headerNome:  { fontFamily: 'Helvetica-Bold', fontSize: 11, textAlign: 'center', marginBottom: 2 },
  headerInfo:  { fontSize: 9, textAlign: 'center', color: '#444', marginBottom: 1 },

  title:       { fontFamily: 'Helvetica-Bold', fontSize: 13, textAlign: 'center', textDecoration: 'underline', marginTop: 32, marginBottom: 32 },
  body:        { fontSize: 12, lineHeight: 1.8, textAlign: 'justify', marginBottom: 48 },
  bold:        { fontFamily: 'Helvetica-Bold' },

  dateRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 64, gap: 10 },
  dateBlock:   { alignItems: 'center', minWidth: 56 },
  dateValue:   { fontFamily: 'Helvetica-Bold', fontSize: 14 },
  dateLabel:   { fontSize: 9, color: '#888', marginTop: 2 },
  dateSep:     { fontSize: 16, paddingBottom: 12 },

  sigLine:     { borderBottomWidth: 1, borderBottomColor: '#000', width: 300, marginTop: 48, marginBottom: 6, alignSelf: 'center' },
  sigName:     { fontSize: 11, textAlign: 'center' },

  footer:      { flexDirection: 'column', alignItems: 'center', marginTop: 40, gap: 4 },
  footerAssoc: { fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center' },
  footerUser:  { fontSize: 11, textAlign: 'center' },
});

function renderCorpo(segmentos) {
  return React.createElement(
    Text,
    { style: S.body },
    ...segmentos.map(([texto, negrito], i) =>
      React.createElement(Text, { key: i, style: negrito ? S.bold : null }, texto)
    )
  );
}

function TermoCancelamento({ NOME, CPF, PLACA, PLACA_TOP, MOTIVO, USER, ASSOCIACAO, TIPO }) {
  const assocCfg   = ASSOC_CONFIG[ASSOCIACAO] || ASSOC_CONFIG.APROVAUTO;
  const isTop      = TIPO === 'TOP';
  const headerLogo = isTop ? TOP_CONFIG.logo : assocCfg.logo;
  const titulo     = isTop ? 'PEDIDO DE CANCELAMENTO TOP MONITORAMENTO' : 'PEDIDO DE CANCELAMENTO';
  const segmentos  = isTop ? assocCfg.corpoTop(NOME, CPF, PLACA_TOP) : assocCfg.corpoCancel(NOME, CPF, PLACA, MOTIVO);
  const rodape     = isTop ? TOP_CONFIG.rodape : assocCfg.rodape;

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: S.page },

      React.createElement(View, { style: S.header },
        React.createElement(Image, { style: isTop ? S.logo : S.logoAssoc, src: headerLogo }),
        React.createElement(Text, { style: S.headerNome }, assocCfg.nome),
        React.createElement(Text, { style: S.headerInfo }, assocCfg.endereco),
        React.createElement(Text, { style: S.headerInfo }, assocCfg.cnpj),
        React.createElement(Text, { style: S.headerInfo }, assocCfg.telefone)
      ),

      React.createElement(Text, { style: S.title }, titulo),

      renderCorpo(segmentos),

      React.createElement(View, { style: S.dateRow },
        React.createElement(View, { style: S.dateBlock },
          React.createElement(Text, { style: S.dateValue }, '______'),
          React.createElement(Text, { style: S.dateLabel }, 'DIA')
        ),
        React.createElement(Text, { style: S.dateSep }, '/'),
        React.createElement(View, { style: S.dateBlock },
          React.createElement(Text, { style: S.dateValue }, '______'),
          React.createElement(Text, { style: S.dateLabel }, 'MÊS')
        ),
        React.createElement(Text, { style: S.dateSep }, '/'),
        React.createElement(View, { style: S.dateBlock },
          React.createElement(Text, { style: S.dateValue }, '______'),
          React.createElement(Text, { style: S.dateLabel }, 'ANO')
        )
      ),

      React.createElement(View, { style: S.sigLine }),
      React.createElement(Text, { style: S.sigName },
        'ASSOCIADO(A): ',
        React.createElement(Text, { style: S.bold }, NOME)
      ),

      React.createElement(View, { style: S.footer },
        React.createElement(Text, { style: S.footerAssoc }, rodape),
        React.createElement(Text, { style: S.footerUser }, USER)
      )
    )
  );
}

module.exports = TermoCancelamento;
