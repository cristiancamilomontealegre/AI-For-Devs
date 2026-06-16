# Sistema de Gestión de Inventario - Guía para Agentes

## Descripción del Proyecto

Sistema web full-stack para gestión de inventario con seguimiento de productos, movimientos de entrada/salida y alertas de stock mínimo.

## Stack Tecnológico

- **Backend**: NestJS + TypeORM + PostgreSQL
- **Frontend**: React + Vite + TypeScript + Axios
- **API**: REST (JSON)

## Estructura del Proyecto

```
AI4Devs/
├── backend/
│   └── src/
│       ├── products/          # Módulo de productos (ABM)
│       ├── movements/         # Módulo de movimientos (entradas/salidas)
│       └── inventory/         # Módulo de inventario (consultas de stock)
├── frontend/
│   └── src/
│       ├── components/        # Componentes React (StockBadge, etc.)
│       ├── hooks/            # Custom hooks (useProducts, useStock)
│       └── services/         # API client
├── docs/                     # Documentación del proyecto
│   ├── PRD.md               # Product Requirements Document
│   ├── user-stories.md      # Historias de usuario con Gherkin
│   └── tickets.md           # Backlog de tareas
└── .cursor/
    └── rules/               # Reglas del proyecto
```

## Conceptos Clave

### Stock Calculado

El stock **NO** se almacena en base de datos. Se calcula dinámicamente:

```
stockActual = SUM(entradas) - SUM(salidas)
```

### Protecciones

1. **No eliminar productos con movimientos**: lanza `ConflictException`
2. **Stock suficiente para salidas**: valida antes de insertar
3. **SKU inmutable**: no se puede modificar después de creación
4. **Movimientos solo en productos activos**: valida estado

### Estados de Producto

- `activo`: permite movimientos
- `inactivo`: no permite movimientos, se muestra con badge gris

### Alertas

Un producto está en alerta cuando `stockActual < stockMinimo`. Debe mostrarse con badge rojo.

## Flujo de Trabajo

### Backend

1. Validación de datos con `class-validator` en DTOs
2. Lógica de negocio en Services
3. Manejo de errores con excepciones de NestJS
4. Cálculo de stock en tiempo real con queries agregadas

### Frontend

1. Componentes funcionales con hooks
2. Validación en tiempo real en formularios
3. Indicadores visuales (StockBadge)
4. Llamadas API con Axios

## Testing

- **Unit tests**: Jest para services y controllers
- **E2E tests**: Jest con configuración e2e
- **PBT tests**: Property-based testing con patron `.pbt.spec.ts`

## Comandos Útiles

```bash
# Backend
pnpm run start:dev   # Desarrollo con watch mode
pnpm run build       # Build de producción
pnpm run test        # Tests unitarios
pnpm run test:e2e    # Tests end-to-end

# Frontend
pnpm dev             # Desarrollo Vite
pnpm run build       # Build de producción

# Linting y formateo (backend)
pnpm run lint        # Verificar/corregir linting
pnpm run format      # Formatear con Prettier
```

## Documentación de Referencia

- **PRD**: `docs/PRD.md` - Requisitos completos del sistema
- **User Stories**: `docs/user-stories.md` - Historias con criterios de aceptación
- **Tickets**: `docs/tickets.md` - Backlog de tareas

## Reglas Aplicadas

Las reglas en `.cursor/rules/` se aplican automáticamente:

- **Always Apply**: `core-standards.mdc`, `business-rules.mdc`
- **Backend TS**: `typescript-backend.mdc`, `nestjs-patterns.mdc`
- **DTOs**: `dto-validation.mdc`
- **Errors**: `error-handling.mdc`
- **Database**: `database-rules.mdc`
- **Frontend**: `react-frontend.mdc`

## Próximos Pasos

Consultar `docs/tickets.md` para ver el backlog actual y las tareas pendientes.
