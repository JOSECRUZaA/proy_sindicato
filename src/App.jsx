import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardView from './pages/DashboardView';
import Dashboard from './components/Dashboard';
import Afiliados from './pages/Afiliados';
import Vehiculos from './pages/Vehiculos';
import Rutas from './pages/Rutas';
import Asambleas from './pages/Asambleas';
import Hacienda from './pages/Hacienda';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/dashboard" element={<DashboardView />}>
            <Route index element={<Dashboard />} />
            <Route path="afiliados" element={<Afiliados />} />
            <Route path="vehiculos" element={<Vehiculos />} />
            <Route path="rutas" element={<Rutas />} />
            <Route path="asambleas" element={<Asambleas />} />
            <Route path="hacienda" element={<Hacienda />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="usuarios" element={<Usuarios />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
