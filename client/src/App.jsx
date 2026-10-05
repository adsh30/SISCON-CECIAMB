import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AvisosProvider } from './components/ui/Avisos.jsx'
import AjustesPage from './features/ajustes/AjustesPage.jsx'
import CambiarClavePage from './features/auth/CambiarClavePage.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import InicioPage from './features/inicio/InicioPage.jsx'
import LandingPage from './features/landing/LandingPage.jsx'
import UsuariosPage from './features/usuarios/UsuariosPage.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import { useAplicarPreferencias } from './lib/preferencias.js'
import { RequireModulo, RutaProtegida } from './routes/RutaProtegida.jsx'

export default function App() {
  useAplicarPreferencias()
  return (
    <AvisosProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cambiar-clave" element={<CambiarClavePage />} />
          <Route element={<RutaProtegida />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<InicioPage />} />
              <Route
                path="usuarios"
                element={
                  <RequireModulo modulo="usuarios">
                    <UsuariosPage />
                  </RequireModulo>
                }
              />
              <Route path="ajustes" element={<AjustesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AvisosProvider>
  )
}
