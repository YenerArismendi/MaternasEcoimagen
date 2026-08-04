import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import ThemeConfig from './pages/ThemeConfig';
import Maternas from './pages/Maternas';
import MaternaDetail from './pages/MaternaDetail';
import Paquetes from './pages/Paquetes';
import Anuncios from './pages/Anuncios';

import { NotificationProvider } from './context/NotificationContext';
import NotificationSystem from './components/NotificationSystem';

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <NotificationSystem />
            <Routes>
              <Route path="/" element={<Login />} />

              {/* Rutas protegidas - ProtectedRoute usa Outlet */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/maternas" element={<Maternas />} />
                  <Route path="/maternas/:id" element={<MaternaDetail />} />
                  <Route path="/anuncios" element={<Anuncios />} />
                </Route>
              </Route>

              {/* Rutas solo ADMIN */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route element={<Layout />}>
                  <Route path="/usuarios" element={<Users />} />
                  <Route path="/paquetes" element={<Paquetes />} />
                  <Route path="/configuracion" element={<ThemeConfig />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
