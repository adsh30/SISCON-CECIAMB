// Variables de entorno de pruebas: BD aislada y administrador conocido.
// Node no sobrescribe variables ya definidas al cargar .env, así que estas tienen prioridad.
export const testEnv = {
  NODE_ENV: 'test',
  DB_NAME: 'siscon_test',
  ADMIN_NOMBRE: 'Admin Pruebas',
  ADMIN_EMAIL: 'admin@pruebas.local',
  ADMIN_PASSWORD: 'Clave-Pruebas-123',
}
