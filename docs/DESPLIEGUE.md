# Despliegue automático (bot) — SISCON-CECIAMB

El sistema en uso por el hospital corre desde una **copia de producción** (rama `main`) en la PC servidor. Un bot la mantiene encendida y publica solo cada cambio que llega a `main`.

```
feature/* ─► dev ─► main ──(bot, cada 5 min)──► PC servidor del hospital
                     │
                     └─ GitHub Actions (CI): lint + pruebas + compilación
```

## Qué hace el bot (`scripts/despliegue/bot.mjs`)

1. Mantiene el sistema encendido en `http://<PC>:8080` y lo reinicia si se cae.
2. Cada `BOT_INTERVALO_MIN` minutos hace `git fetch origin main`. Si hay commits nuevos:
   1. **Respalda la base de datos** con `mariadb-dump` en `respaldos/`.
   2. Actualiza el código (`git merge --ff-only`).
   3. `npm ci`, **lint y pruebas** (`npm test`, contra `siscon_test`) y compilación de la interfaz.
   4. Detiene el sistema, aplica **migraciones** y lo vuelve a encender.
   5. Verifica que `/api/v1/health` responda con la base de datos en línea.
3. Si cualquier paso falla, **vuelve a la versión anterior** y el sistema sigue funcionando. Esa versión no se reintenta hasta que llegue otro commit a `main`.
4. Deja constancia en la **bitácora**: _Actualización_ (con la lista de cambios) o _Actualización rechazada_ (con el motivo), y en `logs/bot.log`.

Mientras se compila y se prueban los cambios, el sistema sigue atendiendo. Solo se detiene unos segundos para migrar y reiniciar.

## Instalación (una vez, en la PC servidor)

Por ahora el sistema se usa **solo en esta PC** (http://localhost:8080). Para abrirlo a la red más adelante, se vuelve a ejecutar el instalador con `-AbrirFirewall` como administrador.

Requisitos: Node 24, Git con acceso al repositorio, MariaDB con `siscon_db` y `siscon_test`.

```powershell
# Desde la carpeta del repositorio de desarrollo
powershell -ExecutionPolicy Bypass -File scripts\despliegue\instalar-produccion.ps1 -AbrirFirewall
```

El instalador:

- clona `main` en `C:\SISCON-CECIAMB`;
- crea su `.env` (copia el de desarrollo con `NODE_ENV=production`, `PORT=8080`);
- instala, compila, migra y crea el administrador si no existe;
- registra la tarea programada **«SISCON-CECIAMB (sistema contable)»**, que arranca al iniciar sesión en Windows y se reinicia si se detiene;
- con `-AbrirFirewall` (como administrador) permite el acceso desde otras PCs de la red.

> La tarea corre con el usuario de Windows que la instala, para usar sus credenciales de GitHub. Configure ese usuario para iniciar sesión automáticamente en la PC servidor.

## Publicar cambios

Cada entrega se integra en `dev` y enseguida en `main`; el bot la publica sola:

```bash
git checkout main && git pull
git merge --no-ff dev
git push origin dev main
```

Al cerrar una fase, además se etiqueta la versión:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z" main && git push origin vX.Y.Z
```

En un máximo de 5 minutos el bot la toma. Siga el avance en `C:\SISCON-CECIAMB\logs\bot.log`, o en **Bitácora → módulo Sistema** dentro del propio sistema.

## Configuración (`.env` de producción)

| Variable            | Por defecto                                          | Uso                                       |
| ------------------- | ---------------------------------------------------- | ----------------------------------------- |
| `BOT_RAMA`          | `main`                                               | Rama que se publica                       |
| `BOT_INTERVALO_MIN` | `5`                                                  | Minutos entre revisiones                  |
| `BOT_PRUEBAS`       | `true`                                               | Ejecutar lint y pruebas antes de publicar |
| `BOT_RESPALDOS`     | `respaldos`                                          | Carpeta de respaldos de la BD             |
| `MARIADB_DUMP`      | `C:\Program Files\MariaDB 13.0\bin\mariadb-dump.exe` | Herramienta de respaldo                   |
| `COOKIE_SECURE`     | `false`                                              | `true` solo si se publica con https       |

## Operación

- **Ver estado:** `http://localhost:8080/api/v1/health` (incluye `version`, el commit en uso).
- **Detener o arrancar:** Programador de tareas → «SISCON-CECIAMB (sistema contable)» → Finalizar / Ejecutar.
- **Correr a mano:** `npm run produccion` dentro de `C:\SISCON-CECIAMB`.
- **Restaurar un respaldo:** `mariadb -u root -p siscon_db < respaldos\<archivo>.sql`.
- No edite archivos dentro de `C:\SISCON-CECIAMB`: el bot solo avanza si la copia está limpia. Los cambios se hacen en el repositorio de desarrollo y llegan por `main`.
