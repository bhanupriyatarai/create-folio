const TOKEN_NAME = 'bhanupriya-create-folio';

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_NAME);
  } catch (err) {
    return null;
  }
};

export const storeTokenFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem(TOKEN_NAME, token);
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    }
  } catch (err) {
    return null;
  }
  return null;
};

export const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_NAME);
  } catch (err) {
    // ignore storage errors
  }
};

export const buildAuthHeaders = () => {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

