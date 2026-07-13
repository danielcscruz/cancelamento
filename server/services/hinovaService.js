const HINOVA_API = process.env.HINOVA_API_URL || 'https://api.hinova.com.br/api/sga/v2';

// Cada associação tem suas próprias credenciais na Hinova, mas usa o mesmo endpoint.
const CREDENCIAIS = {
  APROVAUTO: {
    baseToken: process.env.HINOVA_BASE_TOKEN,
    usuario: process.env.HINOVA_USUARIO,
    senha: process.env.HINOVA_SENHA,
  },
  CONEXAO: {
    baseToken: process.env.CONEXAO_BASE_TOKEN,
    usuario: process.env.CONEXAO_USUARIO,
    senha: process.env.CONEXAO_SENHA,
  },
};

// token_usuario não expira — cacheado em memória por associação após primeira autenticação
const cachedTokens = {};

async function autenticar(associacao) {
  const cred = CREDENCIAIS[associacao];
  if (!cred) throw new Error(`Associação desconhecida: ${associacao}`);

  const res = await fetch(`${HINOVA_API}/usuario/autenticar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cred.baseToken}`,
    },
    body: JSON.stringify({
      usuario: cred.usuario,
      senha: cred.senha,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha na autenticação Hinova [${associacao}] (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.token_usuario) throw new Error('Hinova não retornou token_usuario');
  cachedTokens[associacao] = data.token_usuario;
  return cachedTokens[associacao];
}

async function getToken(associacao) {
  return cachedTokens[associacao] || autenticar(associacao);
}

async function buscarAssociado(cpfCnpj, associacao = 'APROVAUTO') {
  const token = await getToken(associacao);
  const digits = String(cpfCnpj).replace(/\D/g, '');
  const url = `${HINOVA_API}/associado/buscar/${digits}/cpf`;

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const res = await fetch(url, { headers });

  // Token inválido: limpa cache e tenta uma vez mais com nova autenticação
  if (res.status === 401) {
    cachedTokens[associacao] = null;
    const newToken = await autenticar(associacao);
    const retry = await fetch(url, { headers: { ...headers, 'Authorization': `Bearer ${newToken}` } });
    if (!retry.ok) throw new Error(`Hinova: ${retry.status}`);
    return retry.json();
  }

  if (!res.ok) throw new Error(`Hinova: ${res.status}`);
  return res.json();
}

module.exports = { buscarAssociado };
