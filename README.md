# SISCON-CECIAMB

Sistema contable del Hospital de Clínicas CECIAMB (Ciudad Guayana): comprobantes por partida doble, plan de cuentas, períodos, libros, tasas BCV, usuarios con permisos y bitácora de auditoría.

**Stack:** Node.js 24 · Express 5 · knex · MariaDB · React 19 · Vite · Tailwind CSS 4 · TanStack Query.

## Guías

| Documento                                    | Para qué                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| [docs/CONTEXTO.md](docs/CONTEXTO.md)         | **Empiece aquí:** qué es, reglas, estructura, plugins y base local en un paso |
| [docs/INSTALACION.md](docs/INSTALACION.md)   | Entrar desde otra PC de la red, o montar una copia local para desarrollar     |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)     | Instalar producción y el bot que publica la rama `main`                       |
| [docs/ROADMAP.md](docs/ROADMAP.md)           | Fases del proyecto y estado                                                   |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Requisitos funcionales y reglas contables                                     |
| `client/public/manual.html`                  | Manual de usuario (también en el menú **Manual del sistema**)                 |

## Comandos

```powershell
npm install          # dependencias
npm run db:migrate   # tablas
npm run db:seed      # roles, administrador y datos iniciales
npm run bd:preparar  # base local de una vez (con -- respaldos\archivo.sql trae una copia)
npm run bd:exportar  # copia de la base para compartir
npm run dev          # servidor :4000 y página :5173
npm run lint         # revisión de código
npm test             # pruebas (base siscon_test)
```
