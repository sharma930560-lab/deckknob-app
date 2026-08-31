const DEFAULT_API_ORIGIN = 'http://localhost:8000';
const rawApiUrl = import.meta.env.VITE_API_URL || DEFAULT_API_ORIGIN;

export const API_BASE_URL = rawApiUrl.replace(/\/$/, '');
export const API_BASE = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
