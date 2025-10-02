import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createSession = async () => {
  const response = await api.post('/sessions');
  return response.data;
};

export const getSession = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data;
};

export const sendMessage = async (sessionId, message) => {
  const response = await api.post('/insurance/chat', {
    session_id: sessionId,
    prompt: message,
  });
  return response.data;
};

export const setSessionBaseIdentifier = async (sessionId, baseIdentifier) => {
  const response = await api.put(`/sessions/${sessionId}/base-identifier`, {
    base_identifier: baseIdentifier,
  });
  return response.data;
};

export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
