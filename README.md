# Sistema de Gestión de Inventario

Aplicación full-stack para administrar productos, registrar movimientos de entrada y salida, y consultar el stock disponible en tiempo real. El sistema alerta visualmente cuando un producto activo cae por debajo de su stock mínimo configurable.

## Descripción general

| Capa | Tecnología |
|------|------------|
| Backend | NestJS + TypeORM + PostgreSQL |
| Frontend | React + Vite + TypeScript + Axios |
| API | REST (JSON) |
| Tests | Jest, fast-check (PBT), Stryker, Vitest, Playwright |
| CI | GitHub Actions |

### Funcionalidades principales

- **Productos:** alta (UI + API), edición (SKU inmutable), activación/desactivación y eliminación protegida.
- **Movimientos:** entradas y salidas con razones predefinidas y validación de stock.
- **Inventario:** stock calculado dinámicamente (`SUM(entradas) − SUM(salidas)`) y alertas de stock bajo.
- **UI:** listado con `StockBadge` (verde / rojo / gris) y formulario de movimientos con validación en tiempo real.

### Reglas de negocio críticas

- El stock **nunca** se persiste en la tabla `products`; siempre se calcula desde movimientos.
- El **SKU** es único e inmutable después de la creación.
- No se puede **eliminar** un producto con movimientos asociados.
- Las **salidas** requieren stock suficiente; la cantidad debe ser un entero ≥ 1.
- Solo productos **activos** admiten movimientos.
- Alerta de stock bajo cuando `currentStock < minimumStock`.

## Estructura del proyecto

```
├── backend/          # API NestJS
├── frontend/         # UI React
├── docs/             # PRD, user stories, tickets, colección Postman
├── e2e/              # Pruebas Playwright
├── prompts.md        # Registro de prompts usados con IA
├── docker-compose.yml
└── .env.example
```

## Requisitos previos

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 10+
- [Docker](https://www.docker.com/) (recomendado para PostgreSQL)
- [Git](https://git-scm.com/)

## Despliegue

| Entorno | URL |
|---------|-----|
| Frontend (producción) | https://ai-for-devs.vercel.app/ |
| Backend API (producción) | https://ai-for-devs.onrender.com/api |

## Inicio rápido con Docker

```bash
cp .env.example .env          
docker compose up -d
```

| Servicio | URL local |
|----------|-----------|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| PostgreSQL | localhost:5432 |

---

## Desarrollo local paso a paso

### Paso 1 — Variables de entorno

Desde la raíz del repositorio:

```bash
cp .env.example .env
```

Contenido relevante (`.env`):

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=inventario
CORS_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:3000/api
```

### Paso 2 — Base de datos

**Opción A — Solo PostgreSQL en Docker (recomendada):**

```bash
docker compose up -d postgres
```

**Opción B — PostgreSQL instalado localmente:**

Crea la base de datos `inventario` y ajusta `DB_PORT` en `.env` según tu instalación.

### Paso 3 — Backend (NestJS)

```bash
cd backend
pnpm install
pnpm start:dev
```

El servidor queda disponible en `http://localhost:3000/api`.

Verificación rápida:

```bash
curl http://localhost:3000/api/inventory
```

### Paso 4 — Frontend (Vite)

En otra terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

La aplicación queda en `http://localhost:5173`.

### Paso 5 — Verificación manual

1. Abre `http://localhost:5173`.
2. Revisa el listado de productos y los badges de stock.
3. Crea un producto en `/products/new`.
4. Registra un movimiento en `/movements/new`.
5. Confirma que una salida con stock insuficiente se bloquea antes del envío.

---

## Pruebas

### Backend

```bash
cd backend
pnpm test          # Unitarias (56 tests)
pnpm test:pbt      # Property-Based Testing
pnpm test:mutation # Stryker (mutation testing)
pnpm test:e2e      # API E2E con Supertest (requiere PostgreSQL)
```

`test:e2e` carga automáticamente las variables desde `../.env`.

### Frontend

```bash
cd frontend
pnpm test          # Vitest (29 tests)
pnpm build         # Build de producción
```

### Playwright (E2E de UI)

Desde la raíz del proyecto, con PostgreSQL activo:

```bash
pnpm install
pnpm exec playwright install chromium
docker compose up -d postgres   # si no está corriendo
pnpm test:e2e
```

## API REST (resumen)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/inventory` | Productos con stock calculado |
| GET | `/api/inventory/alerts/low-stock` | Alertas de stock bajo |
| GET | `/api/inventory/products/:id` | Detalle de producto con stock |
| POST | `/api/products` | Crear producto |
| PATCH | `/api/products/:id` | Actualizar producto (sin SKU) |
| PATCH | `/api/products/:id/state` | Activar / desactivar |
| DELETE | `/api/products/:id` | Eliminar (bloqueado si hay movimientos) |
| POST | `/api/movements` | Registrar movimiento |
| GET | `/api/movements` | Listar movimientos (filtros opcionales) |

Colección Postman: `docs/postman/inventory-api.postman_collection.json`

## Documentación de referencia

| Documento | Ubicación |
|-----------|-----------|
| PRD | `docs/PRD.md` |
| User Stories | `docs/user-stories.md` |
| Tickets técnicos | `docs/tickets.md` |
| Prompts con IA | `prompts.md` |

## CI/CD

El pipeline en `.github/workflows/ci.yml` ejecuta en cada push y pull request:

- Tests unitarios y PBT del backend
- Tests E2E Supertest del backend
- Build y tests del frontend
- Playwright E2E con servicio PostgreSQL

## Deuda técnica documentada

| Prioridad | Pendiente | Motivo |
|-----------|-----------|--------|
| Alta | Autenticación y roles | Fuera de alcance del PRD; necesaria en producción real |
| Media | Reportes PDF/CSV | RF excluido explícitamente; el historial en pantalla cubre consulta básica |
| Media | Migraciones TypeORM (`synchronize: false`) | Válido solo para desarrollo; en producción necesita migraciones versionadas |
| Baja | Paginación en listados | Sin impacto con los datos de prueba actuales |
| Baja | Bloqueo pesimista en salidas concurrentes | Analizado en Día 3, no requerido por el curso |
| Baja | i18n | MVP en inglés; PRD sin requisito de multi-idioma |

---

## Licencia

Proyecto académico — AI4Devs.
