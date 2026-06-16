# Tickets Técnicos — Sistema de Gestión de Inventario

---

## TK-01: Configuración inicial del proyecto NestJS + TypeORM + PostgreSQL

**Relación:** US-01, US-02, US-03, US-04

### Descripción
Inicializar el proyecto backend con NestJS, configurar TypeORM para conexión a PostgreSQL y establecer la estructura de carpetas del proyecto.

### Tareas Técnicas
- [ ] Ejecutar `nest new inventory-backend` con el gestor de paquetes definido.
- [ ] Instalar dependencias: `@nestjs/typeorm`, `typeorm`, `pg`, `class-validator`, `class-transformer`.
- [ ] Configurar `app.module.ts` con `TypeOrmModule.forRoot()` apuntando a PostgreSQL.
- [ ] Crear archivo `.env` con variables de conexión a la base de datos.
- [ ] Configurar `validation.pipe` global en `main.ts`.
- [ ] Establecer estructura de carpetas: `src/modules/products/`, `src/modules/movements/`, `src/shared/`.

### Definition of Done (DoD)
- [ ] El proyecto arranca con `npm run start:dev` sin errores.
- [ ] La aplicación responde en `http://localhost:3000`.
- [ ] TypeORM se conecta a PostgreSQL y las tablas se crean automáticamente con `synchronize: true`.

---

## TK-02: Implementar entidad y CRUD de Productos

**Relación:** US-01

### Descripción
Crear la entidad `Product` y el módulo completo con endpoints CRUD, validaciones y SKU único.

### Tareas Técnicas
- [ ] Crear entidad `Product` con columnas: `id` (PK auto), `sku` (único, no nulo), `nombre`, `descripcion`, `precio` (decimal), `stockMinimo` (int, default 0), `estado` (enum: activo/inactivo, default activo), `createdAt`, `updatedAt`.
- [ ] Implementar `ProductsService` con métodos: `create`, `findAll` (con filtros), `findOne`, `update`, `remove`.
- [ ] Implementar `ProductsController` con endpoints REST:
  - `POST /api/products`
  - `GET /api/products`
  - `GET /api/products/:id`
  - `PATCH /api/products/:id`
  - `DELETE /api/products/:id`
- [ ] Agregar DTOs con decoradores de `class-validator`: `CreateProductDto`, `UpdateProductDto`.
- [ ] Validar que el SKU sea único en la creación (consulta previa o unique constraint con manejo de error).
- [ ] Validar que `precio > 0` y `stockMinimo >= 0`.

### Definition of Done (DoD)
- [ ] Todos los endpoints CRUD funcionan y se prueban con Postman/Thunder Client.
- [ ] SKU duplicado devuelve `409 Conflict`.
- [ ] Validaciones de precio y stock mínimo devuelven `400 Bad Request`.
- [ ] Pruebas unitarias del servicio cubren casos felices y errores.

---

## TK-03: Implementar cambio de estado de producto (PATCH state)

**Relación:** US-02

### Descripción
Agregar endpoint para cambiar el estado de un producto entre activo e inactivo.

### Tareas Técnicas
- [ ] Crear DTO `UpdateProductStateDto` con campo `estado` validado como enum (`activo` | `inactivo`).
- [ ] Agregar método `updateState(id, dto)` en `ProductsService`.
- [ ] Agregar endpoint `PATCH /api/products/:id/state` en `ProductsController`.
- [ ] Validar que el producto existe antes de actualizar (devuelve `404` si no existe).

### Definition of Done (DoD)
- [ ] El endpoint cambia correctamente el estado.
- [ ] Estado inválido devuelve `400 Bad Request`.
- [ ] Producto inexistente devuelve `404 Not Found`.

---

## TK-04: Implementar restricción de borrado lógico de producto con movimientos

**Relación:** US-03

### Descripción
Modificar el método `remove` de `ProductsService` para que valide que el producto no tenga movimientos asociados antes de eliminarlo.

### Tareas Técnicas
- [ ] En el método `remove`, antes de eliminar, contar movimientos del producto.
- [ ] Si `movementsCount > 0`, lanzar excepción `ConflictException` con mensaje descriptivo.
- [ ] Asegurar que el endpoint `DELETE /api/products/:id` devuelva `409 Conflict` en ese caso.
- [ ] (Opcional) En lugar de borrado físico, implementar borrado lógico con columna `deletedAt` usando `@DeleteDateColumn()`.

### Definition of Done (DoD)
- [ ] Producto sin movimientos se elimina correctamente (`200`).
- [ ] Producto con movimientos recibe `409 Conflict`.
- [ ] Prueba unitaria del servicio para ambos casos.

---

## TK-05: Implementar entidad y registro de Movimientos

**Relación:** US-04

### Descripción
Crear la entidad `Movement` con tipo entrada/salida, razones predefinidas, relación con producto y validación de stock suficiente para salidas.

### Tareas Técnicas
- [ ] Crear entidad `Movement` con columnas: `id` (PK auto), `productoId` (FK → Product), `tipo` (enum: entrada/salida), `cantidad` (int > 0), `razon` (enum: compra/venta/ajuste/devolucion/perdida), `fecha` (timestamp, default now).
- [ ] Configurar relación `ManyToOne` con `Product`.
- [ ] Implementar `MovementsService`:
  - `create(dto)`: validar producto activo, validar cantidad > 0, si es salida calcular stock actual y comparar, luego insertar.
  - `findAll(filtros)`: filtrar por productoId, tipo, fechaDesde, fechaHasta.
- [ ] Implementar `MovementsController`:
  - `POST /api/movements`
  - `GET /api/movements`
- [ ] Implementar cálculo de stock actual en el servicio (reutilizable):
  ```sql
  SELECT
    COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN tipo = 'salida' THEN cantidad ELSE 0 END), 0)
  FROM movements
  WHERE productoId = :id
  ```

### Definition of Done (DoD)
- [ ] Entrada se registra siempre sin restricción de stock.
- [ ] Salida con stock suficiente se registra correctamente.
- [ ] Salida con stock insuficiente devuelve `400 Bad Request`.
- [ ] Movimiento para producto inactivo devuelve `400`.
- [ ] Cantidad <= 0 devuelve `400`.

---

## TK-06: Implementar endpoint de stock calculado y alertas

**Relación:** US-05

### Descripción
Crear endpoint que devuelva todos los productos con su stock calculado en tiempo real y un indicador `alertaStock` (boolean) basado en el stock mínimo.

### Tareas Técnicas
- [ ] Crear método `getStock()` en `ProductsService` que:
  - Obtenga todos los productos.
  - Para cada producto, calcule el stock usando el método de MovementsService.
  - Agregue campo calculado `stockActual` y `alertaStock` (true si `stockActual < stockMinimo`).
- [ ] Crear DTO de respuesta `ProductoConStockDto`.
- [ ] Agregar endpoint `GET /api/products/stock` (o query param `?includeStock=true` en listado).
- [ ] Optimizar con una sola consulta SQL usando `LEFT JOIN` y `GROUP BY` para evitar N+1 queries.

### Definition of Done (DoD)
- [ ] Endpoint devuelve lista con `stockActual` y `alertaStock` para cada producto.
- [ ] Producto sin movimientos muestra stock 0.
- [ ] Producto inactivo se incluye pero con `alertaStock: false`.

---

## TK-07: Implementar pantalla de Lista de Productos con StockBadge (Frontend)

**Relación:** US-05

### Descripción
Crear la pantalla principal del frontend que liste los productos con su stock calculado, filtros y el componente visual StockBadge.

### Tareas Técnicas
- [ ] Inicializar proyecto React con Vite: `npm create vite@latest inventory-frontend -- --template react-ts`.
- [ ] Instalar dependencias: `axios`, `react-router-dom`.
- [ ] Configurar Axios con base URL (`http://localhost:3000/api`).
- [ ] Crear hook `useProducts` que llame a `GET /api/products/stock`.
- [ ] Crear componente `StockBadge`:
  - Props: `stockActual`, `stockMinimo`, `activo`.
  - Verde si activo y `stockActual >= stockMinimo`.
  - Rojo si activo y `stockActual < stockMinimo`.
  - Gris si inactivo (texto "Inactivo").
- [ ] Crear componente `ProductList` con tabla que muestre columnas: SKU, Nombre, Precio, StockBadge, Stock Mínimo, Estado, Acciones.
- [ ] Agregar filtros: input de búsqueda (nombre/SKU), select de estado (todos/activo/inactivo).
- [ ] Agregar loading spinner y mensaje de error si falla la API.

### Definition of Done (DoD)
- [ ] La pantalla carga y muestra los productos correctamente.
- [ ] StockBadge cambia de color según las reglas de negocio.
- [ ] Filtros funcionan correctamente.
- [ ] Se muestra estado de carga y errores de red.

---

## TK-07b: Implementar formulario de Alta de Producto (Frontend)

**Relación:** US-05b, RF-01

### Descripción
Crear formulario para registrar productos con SKU, nombre, descripción, precio y stock mínimo, con validación en tiempo real alineada al backend.

### Tareas Técnicas
- [ ] Crear utilidad `validateProductForm` con reglas de SKU, nombre, precio y stock mínimo.
- [ ] Crear componente `ProductForm` en ruta `/products/new`.
- [ ] Reutilizar `productsService.create` para `POST /api/products`.
- [ ] Deshabilitar envío mientras haya errores de validación.
- [ ] Mostrar errores del backend (SKU duplicado, validación).
- [ ] Redirigir al listado tras creación exitosa.
- [ ] Agregar enlace en navegación y pantalla de lista.
- [ ] Tests unitarios de validación y componente.
- [ ] Test E2E Playwright de creación desde UI.

### Definition of Done (DoD)
- [ ] El formulario crea productos válidos y redirige al listado.
- [ ] La validación en tiempo real bloquea envíos inválidos.
- [ ] Se muestran errores del backend (409 SKU duplicado).
- [ ] Tests unitarios y E2E pasan en CI.

---

## TK-08: Implementar formulario de Movimiento con validación en tiempo real (Frontend)

**Relación:** US-06

### Descripción
Crear formulario para registrar movimientos con selector de producto, tipo, razón, cantidad y validación en tiempo real contra el backend.

### Tareas Técnicas
- [ ] Crear hook `useStock` que llame a `GET /api/products/:id/stock` (o calcule localmente con datos precargados).
- [ ] Crear componente `MovementForm`:
  - Selector de producto tipo `autocomplete` que busca productos por nombre/SKU.
  - Radio group o select para tipo: Entrada / Salida.
  - Select para razón: Compra, Venta, Ajuste, Devolución, Pérdida.
  - Input numérico para cantidad (min=1).
  - Validación en tiempo real:
    - Si tipo = "salida" y hay producto y cantidad seleccionados, consultar stock disponible.
    - Mostrar mensaje de error si cantidad > stock disponible.
    - Mostrar mensaje de error si cantidad <= 0.
    - Deshabilitar botón "Guardar" si hay errores.
  - Resumen visual: stock actual, stock después del movimiento.
- [ ] Al enviar, llamar a `POST /api/movements` y mostrar notificación de éxito/error.
- [ ] Redirigir o limpiar formulario tras éxito.

### Definition of Done (DoD)
- [ ] Formulario valida en tiempo real stock suficiente para salidas.
- [ ] Botón de guardar se deshabilita si hay errores.
- [ ] Movimiento se registra correctamente.
- [ ] Se muestran errores del backend (producto inactivo, etc.).
- [ ] Pantalla responsive y accesible.

---

## TK-09: Configurar CORS, errores globales y logging

**Relación:** TK-01 a TK-08

### Descripción
Configurar CORS para permitir peticiones del frontend, implementar filtro global de excepciones y logging de requests.

### Tareas Técnicas
- [ ] En `main.ts`, habilitar CORS con `origin: 'http://localhost:5173'` (puerto de Vite).
- [ ] Crear `HttpExceptionFilter` global que devuelva formato JSON consistente: `{ statusCode, message, timestamp, path }`.
- [ ] Registrar en consola cada request entrante con método, URL y tiempo de respuesta.

### Definition of Done (DoD)
- [ ] Frontend puede hacer peticiones sin error de CORS.
- [ ] Todos los errores tienen formato JSON consistente.
