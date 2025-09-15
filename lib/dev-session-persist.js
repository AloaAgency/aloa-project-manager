// Development-only session persistence helper
// This helps maintain auth sessions during hot reloads in development

const SESSION_KEY = 'dev_auth_session';

export const saveDevSession = (session) => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        session,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Failed to save dev session:', e);
    }
  }
};

export const getDevSession = () => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const { session, timestamp } = JSON.parse(stored);
        // Session valid for 24 hours in dev
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return session;
        }
      }
    } catch (e) {
      console.error('Failed to get dev session:', e);
    }
  }
  return null;
};

export const clearDevSession = () => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
};