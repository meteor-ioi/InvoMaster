// 如果在 Electron 环境中，window.__API_PORT__ 会由 preload.js 注入
// 否则（开发环境）默认使用 8000
export const API_BASE = window.__API_PORT__
    ? `http://localhost:${window.__API_PORT__}`
    : 'http://localhost:8000';
