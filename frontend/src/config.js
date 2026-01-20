export const API_BASE = import.meta.env.DEV
    ? 'http://localhost:8291'
    : (typeof window !== 'undefined' ? window.location.origin : '');
