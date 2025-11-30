// API Configuration for Stock Logistic Frontend
// Uses environment variables in production, falls back to localhost for development

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  endpoints: {
    // Auth
    auth: `${API_BASE_URL}/api/auth`,
    users: `${API_BASE_URL}/api/users`,

    // Core
    quotes: `${API_BASE_URL}/api/quotes`,
    chat: `${API_BASE_URL}/api/chat`,
    ai: `${API_BASE_URL}/api/ai`,

    // Tools
    loadCalculator: `${API_BASE_URL}/api/load-calculator`,
    pdf: `${API_BASE_URL}/api/pdf`,
    maps: `${API_BASE_URL}/api`,

    // Health
    health: `${API_BASE_URL}/health`,
    status: `${API_BASE_URL}/api/status`
  }
};

export default API_CONFIG;
