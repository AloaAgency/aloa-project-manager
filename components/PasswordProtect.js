'use client';

import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

const CORRECT_PASSWORD = 'aloaagency';
const SESSION_KEY = 'aloa_auth';

export default function PasswordProtect({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated in this session
    const sessionAuth = sessionStorage.getItem(SESSION_KEY);
    if (sessionAuth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-aloa-sand border-t-aloa-black rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="bg-aloa-white p-8 sm:p-12 border-2 border-aloa-black shadow-2xl max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-display font-bold text-aloa-black uppercase text-center mb-2">
            Protected Area
          </h1>
          <p className="text-aloa-gray text-center mb-8 font-body">
            Please enter the password to continue
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-aloa-white border-2 border-aloa-black focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 hover:shadow-md placeholder:text-aloa-gray"
                autoFocus
              />
              {error && (
                <p className="text-red-600 text-sm mt-2 font-body">{error}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full px-6 py-3 bg-aloa-black text-aloa-cream font-display uppercase tracking-wider hover:bg-opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-aloa-black focus:ring-offset-2 focus:ring-offset-white"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}