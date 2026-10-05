import { useHealth } from './api/health.js'

export default function App() {
  const { data, isLoading, error } = useHealth()
  const db = data?.data.baseDatos

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">SISCON-CECIAMB</h1>
        <p className="mt-1 text-sm text-slate-500">Estado del sistema</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>API</dt>
            <dd>{isLoading ? '…' : error ? '❌ sin conexión' : '✅ ok'}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Base de datos</dt>
            <dd>{db ? (db.estado === 'ok' ? `✅ ${db.nombre} (${db.version})` : '❌ error') : '…'}</dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
