import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import LoginPage from './features/auth/LoginPage.jsx'
import InicioPage from './features/inicio/InicioPage.jsx'
import LandingPage from './features/landing/LandingPage.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import { RutaProtegida } from './routes/RutaProtegida.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RutaProtegida />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<InicioPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
