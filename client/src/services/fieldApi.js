const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const fieldApi = {
  detectBoundary({ lat, lng, zoom }) {
    return request('/fields/detect', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, zoom }),
    });
  },

  getParcels() {
    return request('/fields');
  },

  createParcel(payload) {
    return request('/fields', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateParcel(id, payload) {
    return request(`/fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteParcel(id) {
    return request(`/fields/${id}`, {
      method: 'DELETE',
    });
  },
};