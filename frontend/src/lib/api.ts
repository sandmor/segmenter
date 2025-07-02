// API configuration
const getApiUrl = () => {
  if (import.meta.env.PROD) {
    // In production, API is served from the same origin
    return "";
  }
  // In development, use the local backend
  return "http://localhost:8000";
};

export const API_BASE_URL = getApiUrl();
export const API_ENDPOINTS = {
  SEGMENT_AUTO: `${API_BASE_URL}/api/v1/segment/auto`,
  HEALTH: `${API_BASE_URL}/health`,
} as const;
