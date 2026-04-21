const HINOVA_API = process.env.HINOVA_API_URL || 'https://api.hinova.com.br/api/sga/v2';

// token_usuario não expira — cacheado em memória após primeira autenticação
let cachedToken = null;

async function autenticar() {
  const res = await fetch(`${HINOVA_API}/usuario/autenticar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HINOVA_BASE_TOKEN}`,
    },
    body: JSON.stringify({
      usuario: process.env.HINOVA_USUARIO,
      senha: process.env.HINOVA_SENHA,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha na autenticação Hinova (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.token_usuario) throw new Error('Hinova não retornou token_usuario');
  cachedToken = data.token_usuario;
  return cachedToken;
}

async function getToken() {
  return cachedToken || autenticar();
}

async function buscarAssociado(cpfCnpj) {
  const token = await getToken();
  const digits = String(cpfCnpj).replace(/\D/g, '');
  const url = `${HINOVA_API}/associado/buscar/${digits}/cpf`;

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const res = await fetch(url, { headers });

  // Token inválido: limpa cache e tenta uma vez mais com nova autenticação
  if (res.status === 401) {
    cachedToken = null;
    const newToken = await autenticar();
    const retry = await fetch(url, { headers: { ...headers, 'Authorization': `Bearer ${newToken}` } });
    if (!retry.ok) throw new Error(`Hinova: ${retry.status}`);
    return retry.json();
  }

  if (!res.ok) throw new Error(`Hinova: ${res.status}`);
  return res.json();
}

module.exports = { buscarAssociado };
