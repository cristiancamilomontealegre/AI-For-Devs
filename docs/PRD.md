# Product Requirement Document — Sistema de Gestión de Inventario

## 1. Objetivo del Sistema

Desarrollar un sistema de gestión de inventario que permita a los usuarios administrar productos, registrar movimientos de entrada y salida, y consultar el stock disponible en tiempo real. El sistema debe alertar sobre productos con stock por debajo de un mínimo configurable.

## 2. Alcance

**Incluye:**

- Módulo de Productos (ABM con estados activo/inactivo).
- Módulo de Movimientos (registro de entradas y salidas con razones predefinidas).
- Módulo de Inventario (consulta de stock calculado en tiempo real + alertas de stock mínimo).
- Frontend web con listado de productos (con indicador visual de alerta), formulario de alta de producto, historial de movimientos con filtros y formulario de movimiento con validación en tiempo real.

**Excluye:**

- Autenticación y autorización de usuarios.
- Módulo de reportes históricos o exportación de datos.
- Integración con sistemas externos (ERP, proveedores, etc.).
- Módulo de usuarios/roles.

## 3. Restricciones Técnicas

| Capa        | Tecnología                      |
|-------------|---------------------------------|
| Backend     | NestJS + TypeORM + PostgreSQL   |
| Frontend    | React + Vite + Axios            |
| API         | REST (JSON)                     |
| Versionado  | Git                             |

- El stock **no se almacena** como columna; se calcula dinámicamente como `SUM(entradas) - SUM(salidas)`.
- No se permite eliminar un producto si existen movimientos asociados.
- No se permite registrar una salida si el stock disponible es insuficiente.

---

## 4. Requerimientos Funcionales

### 4.1 Módulo de Productos

| ID    | Requerimiento                                                   | Prioridad |
|-------|-----------------------------------------------------------------|-----------|
| RF-01 | Crear un producto con nombre, SKU único, descripción, categoría, unidad de medida, precio y stock mínimo. | Alta      |
| RF-02 | Listar productos con filtros (nombre, SKU, categoría, estado).             | Alta      |
| RF-03 | Obtener un producto por ID.                                     | Media     |
| RF-04 | Actualizar datos de un producto (excepto SKU).                  | Alta      |
| RF-05 | Cambiar estado de un producto entre **activo** e **inactivo**.   | Alta      |
| RF-06 | Eliminar un producto **solo si no tiene movimientos asociados**. | Alta      |
| RF-07 | El SKU debe ser único e inmutable después de la creación.       | Alta      |

### 4.2 Módulo de Movimientos

| ID    | Requerimiento                                                   | Prioridad |
|-------|-----------------------------------------------------------------|-----------|
| RF-08 | Registrar un movimiento de tipo **entrada** o **salida** para un producto. | Alta |
| RF-09 | Asociar cada movimiento a una **razón** predefinida (compra, venta, ajuste, devolución, pérdida). | Alta |
| RF-10 | Validar que el stock sea suficiente antes de registrar una **salida**. | Alta |
| RF-11 | Rechazar movimientos con cantidad <= 0.                         | Alta      |
| RF-12 | Listar movimientos filtrados por producto, tipo y rango de fechas. | Media |

### 4.3 Módulo de Inventario

| ID    | Requerimiento                                                   | Prioridad |
|-------|-----------------------------------------------------------------|-----------|
| RF-13 | Consultar el stock actual de un producto (cálculo en tiempo real). | Alta    |
| RF-14 | Obtener lista de todos los productos con su stock calculado.    | Alta      |
| RF-15 | Identificar productos cuyo stock actual está por debajo del `stockMinimo` (alerta). | Alta |

---

## 5. Definición de Pantallas (Frontend)

### 5.1 Pantalla: Lista de Productos

- Tabla con columnas: SKU, Nombre, Categoría, Unidad, Precio, Stock (calculado), Stock Mínimo, Estado, Acciones.
- **StockBadge**: componente visual que cambia de color y muestra la unidad de medida:
  - **Verde**: stock >= stock mínimo.
  - **Rojo**: stock < stock mínimo (alerta).
  - **Gris**: producto inactivo.
- Filtros: búsqueda por nombre/SKU/categoría, filtro por estado (todos/activo/inactivo). **Por defecto muestra solo productos activos**.
- Acciones por fila: Editar, **Registrar movimiento** (solo activos), Cambiar Estado, Eliminar (deshabilitado si tiene movimientos).
- **Delete vs Deactivate**:
  - Productos **con movimientos**: botón ámbar **Protected** (no delete) + hint *"Has movement history — use Deactivate instead of delete"*; al pulsar Protected se explica que solo puede desactivarse.
  - Productos **sin movimientos**: botón rojo **Delete permanently** con confirmación explícita de borrado irreversible.
- **Confirmaciones modales** antes de desactivar, activar o eliminar.
- Al **desactivar**, el stock calculado **permanece visible** en la columna de stock; el badge pasa a gris y no se permiten nuevos movimientos (RF-05 + regla de productos activos).
- Enlace a la pantalla de alta de producto.

### 5.2 Pantalla: Formulario de Alta de Producto

- Campos: SKU (único, inmutable tras creación), Nombre, Categoría, Unidad de medida (units/kg/liters), Descripción (opcional), Precio, Stock mínimo.
- **Validación en tiempo real**:
  - SKU y nombre obligatorios, con límites de longitud alineados al backend.
  - Precio positivo con hasta 2 decimales (mínimo 0.01).
  - Stock mínimo entero >= 0.
  - El botón de envío se deshabilita mientras haya errores de validación.
- Al enviar, llamar a `POST /api/products` y mostrar notificación de éxito/error.
- Redirigir al listado tras creación exitosa.

### 5.3 Pantalla: Formulario de Movimiento

- Selector de producto (búsqueda por nombre o SKU). Soporta preselección vía query `?productId=` desde la lista de productos.
- Selector de tipo: Entrada / Salida.
- Selector de razón: Compra, Venta, Ajuste, Devolución, Pérdida.
- Campo de cantidad numérico (mínimo 1).
- **Validación en tiempo real**:
  - Si el tipo es "Salida", al seleccionar producto y escribir cantidad, se consulta el stock disponible y se muestra advertencia si la cantidad supera el stock.
  - El botón de envío se deshabilita mientras haya errores de validación.
- Resumen visual: stock actual antes/después del movimiento simulado (con unidad de medida).

### 5.4 Pantalla: Historial de Movimientos

- Tabla con columnas: Fecha, Producto (nombre + SKU), Tipo, Razón, Cantidad (con unidad).
- Filtros: producto, tipo (entrada/salida), rango de fechas (desde/hasta).
- Consume `GET /api/movements` con los filtros seleccionados.

---

## 6. Reglas de Negocio Clave

1. **Stock calculado**: `stockActual = COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN cantidad ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN tipo = 'salida' THEN cantidad ELSE 0 END), 0)`.
2. **Protección de borrado**: no se permite `DELETE` de producto si `Movement.count({ where: { productoId } }) > 0`.
3. **Stock suficiente**: antes de insertar un movimiento de tipo `salida`, se valida `stockActual >= cantidad`.
4. **SKU inmutable**: una vez creado, el SKU no puede modificarse.
5. **Delete vs Deactivate**: un producto con movimientos asociados **no puede eliminarse**; debe **desactivarse** para preservar historial y stock visible.

---

## 7. Matriz de cumplimiento (requisitos del curso)

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Productos con nombre, descripción, categoría, unidad de medida, stock mínimo, activo/inactivo | ✅ | Backend + frontend |
| No eliminar si tiene movimientos; solo desactivar | ✅ | Backend 409 + UI **Protected** / **Deactivate** |
| Movimientos entrada/salida con cantidad, producto, fecha, razón | ✅ | Razón `loss` ≈ merma del enunciado |
| Salida no supera stock disponible | ✅ | Backend + validación en tiempo real en frontend |
| Stock = entradas − salidas | ✅ | Calculado dinámicamente |
| Alerta stock mínimo + endpoint dedicado | ✅ | `GET /api/inventory/alerts/low-stock` |
| Historial de movimientos con filtros | ✅ | API + pantalla `/movements` |
| Pantalla lista de productos con indicador de stock bajo | ✅ | Filtro activos por defecto; categoría/unidad; link **Register movement** |
| Pantalla registro de movimiento con validación en vivo | ✅ | `/movements/new` + preselección por `productId` |
| Formulario alta de producto | ✅ | `/products/new` con categoría y unidad |
