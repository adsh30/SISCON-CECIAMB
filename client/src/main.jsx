import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { esErrorDeConexion } from './api/client.js'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Solo se reintenta lo que falló por conexión; un 403 o un 404 no cambia al repetirlo
      retry: (intentos, error) => esErrorDeConexion(error) && intentos < 3,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
