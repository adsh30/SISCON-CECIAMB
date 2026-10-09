# Conectarse a SISCON-CECIAMB

Hay dos formas, según lo que necesite la persona:

| Necesito…                                        | Opción                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| Usar el sistema (registrar, consultar, imprimir) | [A. Entrar desde otra PC de la red](#a-entrar-desde-otra-pc-de-la-red) |
| Programar o probar cambios con una copia aparte  | [B. Copia local para desarrollar](#b-copia-local-para-desarrollar)     |

Con la opción A todos trabajan sobre **los mismos datos**. La opción B tiene su propia base de datos, vacía al empezar.

---

## A. Entrar desde otra PC de la red

No se instala nada en la PC del compañero.

1. Ambos equipos en la **misma red** (el mismo Wi-Fi o la red del hospital).
2. En el equipo servidor el sistema debe estar encendido:
   - Desarrollo: `npm run dev` → puerto **5173**.
   - Producción (instalado con `scripts/despliegue/instalar-produccion.ps1`) → puerto **8080**.
3. En el equipo servidor, ver su dirección de red con `ipconfig` (línea «Dirección IPv4» del Wi-Fi o Ethernet, p. ej. `192.168.88.95`). No sirven las direcciones de VPN (p. ej. `100.x.x.x` de HotspotShield): el compañero no las alcanza.
4. El compañero abre Chrome o Edge y escribe `http://<dirección>:5173` (desarrollo) o `http://<dirección>:8080` (producción).
5. Si no abre, falta permitir el puerto en el firewall del **equipo servidor**. En PowerShell **como administrador**, una sola vez:

   ```powershell
   New-NetFirewallRule -DisplayName "SISCON" -Direction Inbound -Protocol TCP -LocalPort 5173,8080 -Action Allow -Profile Private
   ```

   Si la red de Windows figura como «Pública», cámbiela a «Privada» (Configuración → Red e Internet → la conexión → Tipo de perfil de red) o use `-Profile Any`.

6. El administrador le crea el usuario en **Usuarios y roles → Agregar usuario** y le entrega la clave temporal. En el primer ingreso el sistema le pide su clave propia.

> La dirección del equipo servidor puede cambiar si el router la reasigna. Para que sea fija, resérvela en el router (DHCP estático) o configúrela a mano en Windows.

---

## B. Copia local para desarrollar

### 1. Programas (una sola vez)

- **Node.js 24 o superior** — <https://nodejs.org>
- **Git** — <https://git-scm.com>
- **MariaDB 11.8 o superior** — <https://mariadb.org/download> (anote la clave de `root` que elija al instalar)

### 2. Acceso al repositorio

El repositorio es privado: el dueño debe agregarlo en GitHub → `adsh30/SISCON-CECIAMB` → **Settings → Collaborators**.

### 3. Descargar el proyecto

```powershell
cd $HOME\Documents
git clone https://github.com/adsh30/SISCON-CECIAMB.git
cd SISCON-CECIAMB
git checkout dev
npm install
```

### 4. Crear las bases de datos

Abra la consola de MariaDB con `mariadb -u root -p` y ejecute (cambie `ClaveSegura123` por una clave propia):

```sql
CREATE DATABASE siscon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE siscon_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'siscon_app'@'localhost' IDENTIFIED BY 'ClaveSegura123';
GRANT ALL PRIVILEGES ON siscon_db.* TO 'siscon_app'@'localhost';
GRANT ALL PRIVILEGES ON siscon_test.* TO 'siscon_app'@'localhost';
EXIT;
```

`siscon_test` la usan las pruebas automáticas: se borra y se rearma en cada corrida.

### 5. Configurar

```powershell
copy .env.example .env
```

Abra `.env` y complete:

| Variable         | Valor                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `DB_PASSWORD`    | La clave de `siscon_app` del paso 4                                                                    |
| `JWT_SECRET`     | Una cadena larga y secreta: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_EMAIL`    | El correo con el que entrará como administrador                                                        |
| `ADMIN_PASSWORD` | Su clave inicial: al menos 8 caracteres, con letras y números                                          |

### 6. Tablas y datos iniciales

```powershell
npm run db:migrate
npm run db:seed
```

Quedan creados los roles, el administrador, el plan de cuentas base, los centros de costo y los tipos de comprobante.

### 7. Arrancar

```powershell
npm run dev
```

Abra <http://localhost:5173> y entre con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

### 8. Forma de trabajo

```powershell
git checkout dev
git pull
git checkout -b feature/descripcion-corta
```

- Cada cambio incluye **servidor + pantalla + manual** (`client/public/manual.html`).
- Antes de unir a `dev`: `npm run lint` y `npm test` deben pasar.
- A `main` solo va lo terminado: el bot de despliegue publica `main` en producción (ver [DESPLIEGUE.md](DESPLIEGUE.md)).

### Problemas comunes

| Síntoma                                      | Solución                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Access denied for user 'siscon_app'`        | La clave de `.env` no coincide con la del paso 4.                                         |
| `Unknown database 'siscon_db'`               | Falta el paso 4.                                                                          |
| La página dice «Sin conexión con el sistema» | La parte del servidor de `npm run dev` se detuvo: revise la terminal (líneas `[server]`). |
| La página no carga en `localhost:5173`       | La parte `[client]` (Vite) se detuvo: Ctrl+C y `npm run dev` de nuevo.                    |
| `npm test` falla al empezar                  | Falta la base `siscon_test` o sus permisos (paso 4).                                      |
