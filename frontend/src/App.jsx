import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import HomePage from './pages/HomePage';
import CreateFormPage from './pages/CreateFormPage';
import FormPage from './pages/FormPage';
import DashboardPage from './pages/DashboardPage';
import ResponsesPage from './pages/ResponsesPage';

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateFormPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/form/:urlId" element={<FormPage />} />
        <Route path="/responses/:formId" element={<ResponsesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;