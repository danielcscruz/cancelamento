import api from './apiInstance';

export const getRecords = () => api.get('/records').then((r) => r.data);
export const createRecord = (data) => api.post('/records', data).then((r) => r.data);
export const updateRecord = (id, data) => api.put(`/records/${id}`, data).then((r) => r.data);
export const deleteRecord = (id) => api.delete(`/records/${id}`).then((r) => r.data);

export const getUsers = () => api.get('/auth/users').then((r) => r.data);
export const createUser = (data) => api.post('/auth/users', data).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/auth/users/${id}`).then((r) => r.data);
export const changeUserPassword = (id, password) => api.patch(`/auth/users/${id}/password`, { password }).then((r) => r.data);

// Retorna [{name, url}] — o chamador é responsável por revogar as URLs
export const generateDoc = async (data) => {
  const res = await api.post('/generate', data);
  return res.data.docs.map(({ name, data: b64 }) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    return { name, url };
  });
};

export const getLogs = (params) => api.get('/logs', { params }).then((r) => r.data);

export const buscarAssociado = (cpfCnpj) =>
  api.get('/hinova/associado', { params: { cpf: cpfCnpj } }).then((r) => r.data);

export const downloadBlob = (url, filename) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};
