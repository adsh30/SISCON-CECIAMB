import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AvisosProvider } from './components/ui/Avisos.jsx'
import AjustesPage from './features/ajustes/AjustesPage.jsx'
import BitacoraPage from './features/bitacora/BitacoraPage.jsx'
import ComprobantePage from './features/comprobantes/ComprobantePage.jsx'
import ComprobantesPage from './features/comprobantes/ComprobantesPage.jsx'
import ImprimirComprobante from './features/comprobantes/ImprimirComprobante.jsx'
import EmpresaPage from './features/empresa/EmpresaPage.jsx'
import PeriodosPage from './features/periodos/PeriodosPage.jsx'
import PlanCuentasPage from './features/cuentas/PlanCuentasPage.jsx'
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
            <Route
              path="/imprimir/comprobantes/:id"
              element={
                <RequireModulo modulo="comprobantes">
                  <ImprimirComprobante />
                </RequireModulo>
              }
            />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<InicioPage />} />
              <Route
                path="comprobantes"
                element={
                  <RequireModulo modulo="comprobantes">
                    <ComprobantesPage />
                  </RequireModulo>
                }
              />
              <Route
                path="comprobantes/:id"
                element={
                  <RequireModulo modulo="comprobantes">
                    <ComprobantePage />
                  </RequireModulo>
                }
              />
              <Route
                path="usuarios"
                element={
                  <RequireModulo modulo="usuarios">
                    <UsuariosPage />
                  </RequireModulo>
                }
              />
              <Route
                path="periodos"
                element={
                  <RequireModulo modulo="periodos">
                    <PeriodosPage />
                  </RequireModulo>
                }
              />
              <Route
                path="cuentas"
                element={
                  <RequireModulo modulo="plan_cuentas">
                    <PlanCuentasPage />
                  </RequireModulo>
                }
              />
              <Route
                path="empresa"
                element={
                  <RequireModulo modulo="empresa">
                    <EmpresaPage />
                  </RequireModulo>
                }
              />
              <Route
                path="bitacora"
                element={
                  <RequireModulo modulo="bitacora">
                    <BitacoraPage />
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
