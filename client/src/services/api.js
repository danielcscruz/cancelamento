import api from './apiInstance';

export const getRecords = () => api.get('/records').then((r) => r.data);
export const createRecord = (data) => api.post('/records', data).then((r) => r.data);
export const updateRecord = (id, data) => api.put(`/records/${id}`, data).then((r) => r.data);
export const deleteRecord = (id) => api.delete(`/records/${id}`).then((r) => r.data);

export const getUsers = () => api.get('/auth/users').then((r) => r.data);
export const createUser = (data) => api.post('/auth/users', data).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/auth/users/${id}`).then((r) => r.data);

export const generateDoc = async (data) => {
  const res = await api.post('/generate', data, { responseType: 'blob' });
  const contentDisposition = res.headers['content-disposition'] || '';
  const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?(.+)/i);
  let filename = match ? decodeURIComponent(match[1].replace(/"/g, '')) : 'termo.docx';
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
