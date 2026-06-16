# Prompts del Proyecto — Sistema de Gestión de Inventario

---

## Día 1 — PRD, User Stories y tickets técnicos

### Contexto

Primer día, cero código. Solo tenía el enunciado del curso y la idea de que necesitaba documentación antes de abrir el editor. La tentación era arrancar directo con NestJS pero recordé que en proyectos anteriores me había perdido en el código sin tener claro qué reglas de negocio aplicaban. Esta vez quería un PRD que pudiera citar con `@docs` en cada sesión siguiente.

El enunciado menciona "stock mínimo" y "alertas" pero no dice cómo calcular el stock — tuve que decidir que sería `SUM(entradas) − SUM(salidas)` sin columna en la tabla. Eso lo metí explícito porque sabía que si no lo aclaraba, la IA iba a proponer la columna y después sería imposible cambiarla sin refactoring.

### Prompt exacto

```
Actúa como Product Owner. Con el enunciado del sistema de gestión de inventario, genera:

1. docs/PRD.md — alcance, exclusiones (sin auth ni reportes exportables), RF por módulo y reglas de negocio:
   - Stock = SUM(entradas) − SUM(salidas), sin columna en products
   - SKU único e inmutable
   - No eliminar productos con movimientos (solo desactivar)
   - Salidas solo con stock suficiente; movimientos solo en productos activos
   - Productos con categoría y unidad de medida (units | kg | liters)
   - Historial de movimientos filtrable (producto, tipo, rango de fechas)

2. docs/user-stories.md — mínimo 8 user stories en Gherkin con criterios de aceptación:
   - US-01 a US-04: backend (CRUD, estado, borrado protegido, movimientos)
   - US-05: lista con StockBadge
   - US-05b: formulario de alta de producto (categoría + unidad)
   - US-06: formulario de movimiento con validación en tiempo real
   - US-07: lista enriquecida (categoría/unidad, filtro activos por defecto, link a movimiento)
   - US-08: historial de movimientos con filtros

3. docs/tickets.md — backlog TK-01 a TK-09 (+ TK-07b formulario alta) con criterios de aceptación, alineado al PRD

4. .cursor/rules/ — reglas .mdc (negocio, NestJS, DTOs, errores, React) coherentes con el PRD

Trazabilidad RF → US → TK. Naming en inglés en código; snake_case en columnas DB.
```

### Reflexión

El PRD que salió era correcto en alcance pero las user stories eran genéricas al punto de ser inútiles. Cosas como "Como usuario quiero ver el stock para tomar decisiones" — sin escenario concreto, sin criterio de aceptación verificable. Le pedí que las reescribiera en Gherkin con escenarios negativos (SKU duplicado, salida sin stock, producto inactivo) y ahí sí quedaron útiles.

Lo otro que me sorprendió: el primer borrador **no incluyó el historial de movimientos como pantalla frontend**. Lo tenía solo como endpoint de API. Tuve que pedirlo explícito como US-08 con su propia ruta `/movements` porque de lo contrario quedaba como deuda técnica silenciosa. Ese gap me lo dio la IA — no era un error mío de prompt sino una decisión implícita que tomó sola.

Las reglas de `.cursor/rules/` las pedí en el mismo mensaje para no repetir contexto el Día 2. Eso funcionó bien.

---

## Día 3 — Backend: Products y Movements

### Contexto

El Día 2 fue setup: NestJS, TypeORM, Docker, entidades base. Nada del Día 2 es interesante para documentar en prompts porque fue casi mecánico. El Día 3 es donde empieza la lógica real: las reglas que no tienen interpretación posible.

Antes de escribir el prompt revisé el PRD §3 y §4 y copié las reglas literalmente. Aprendí en proyectos anteriores que si describes las reglas en lenguaje vago, la IA las implementa vagamente.

### Prompt exacto

```
Actúa como Senior Backend Developer (NestJS + TypeORM). Implementa Products y Movements según @docs/PRD.md, tickets TK-02 a TK-05 y US-01 a US-04.

Products:
- CRUD con DTOs y class-validator
- Campos: category (string obligatorio), unitOfMeasure (enum units|kg|liters, default units)
- SKU único; no incluir sku en UpdateDto (inmutable)
- DELETE → ConflictException 409 si hay movimientos
- PATCH /products/:id/state para active/inactive
- Filtro opcional por category en GET /products

Movements:
- inbound / outbound con razones del PRD
- Outbound: validar stock con query agregada antes de insertar (no leer columna de stock)
- Rechazar movimientos en productos inactive; cantidad entero >= 1
- Transacciones TypeORM; explica brevemente cómo mitigar salidas simultáneas

Filtros opcionales en GET /movements: productId, type, rango de fechas.
GET /movements debe incluir product (sku, name, unitOfMeasure) vía leftJoin.
Errores con formato { statusCode, message, timestamp, path }.
```

### Reflexión

La implementación cumplía el CRUD pero tenía propiedades mezcladas en español: `categoría`, `estado`, `activo`. No fue un error del prompt — fue que las entidades del Día 2 ya tenían esos nombres y la IA los heredó. Segundo mensaje completo para renombrar todo a inglés en entidades, enums y mensajes HTTP. Perdí como 40 minutos en eso.

Sobre concurrencia: la respuesta propuso transacción + recálculo de stock dentro del mismo `EntityManager`. Le pregunté directamente si eso era suficiente para salidas simultáneas y dijo que no, que habría que añadir bloqueo pesimista (`SELECT ... FOR UPDATE`). No lo implementé porque el alcance del curso no lo exige, pero lo dejé documentado. Valió la pena preguntar aunque no fuera a usarlo.

---

## Día 4 — Backend: Inventory y filtros

### Contexto

Products y Movements ya persistían datos correctamente. Faltaba el módulo que conecta todo: stock calculado en tiempo real, alertas de mínimo y los filtros de movimientos con Query Builder. Sin esto el frontend no tenía de dónde consumir.

### Prompt exacto

```
Implementa el módulo Inventory y mejora GET /movements según PRD y TK-06.

Inventory:
- Stock en tiempo real con agregaciones TypeORM (SUM inbound − SUM outbound)
- Sin columna stock en products
- Respuesta: currentStock, lowStockAlert, category, unitOfMeasure, hasMovements
- Alerta según PRD §5.1: lowStockAlert cuando currentStock < minimumStock (estricto, no <=)
- Endpoint de alertas GET /inventory/alerts/low-stock
- Filtros opcionales: name, sku, category, status

Movements:
- Query Builder con filtros opcionales: productId, type, startDate, endDate
- DTO de filtro validado; join con product para devolver sku, name, unitOfMeasure

Reutiliza lógica de cálculo; evita duplicar la query en tres servicios.
```

### Reflexión

El primer output usó `<=` en la condición de alerta. Eso parece un detalle menor pero rompía la lógica: si `minimumStock = 5` y `currentStock = 5`, el sistema marcaba alerta cuando no debería. El `StockBadge` del frontend dependía de ese booleano — con `<=` mostraba rojo en productos que tenían exactamente el mínimo requerido.

Tuve que volver al PRD, copiar la frase exacta de §5.1 y pegarla en el prompt. Esa fue la lección más concreta del día: en condiciones de borde, el prompt debe llevar la condición matemática literal. "Stock bajo" como lenguaje natural es ambiguo. `currentStock < minimumStock` no lo es.

También pedí extraer un `StockCalculatorService` compartido porque la query de agregación estaba duplicada en `inventory.service.ts` y `movements.service.ts`. Eso lo propuse yo, no la IA.

---

## Día 5 — Frontend: lista de productos y StockBadge

### Contexto

Primera pantalla visible del proyecto. Con el backend funcionando quería ver algo en el navegador. Antes de escribir el prompt hice una lista rápida en papel de lo que tenía que mostrar la tabla — si no lo tenía claro yo, no lo iba a tener claro el prompt.

### Prompt exacto

```
Actúa como Senior React Developer. Implementa ProductList y StockBadge según @docs/PRD.md §5.1, US-05 y US-07.

Requisitos:
- Tabla: SKU, Name, Category, Unit, Price, Current Stock, Minimum Stock, Stock badge, Status, Actions
- StockBadge: verde (stock >= mínimo), rojo (stock < mínimo), gris (inactive); mostrar unidad (units/kg/L)
- Filtro de estado por defecto: active (no "all")
- Búsqueda local por nombre, SKU o categoría
- Acciones por fila: Edit, Register movement (solo activos → /movements/new?productId=), Deactivate/Activate
- Delete vs Deactivate según PRD:
  - Con movimientos: botón ámbar "Protected" + hint; modal informativo al pulsar
  - Sin movimientos: botón rojo "Delete permanently" con confirmación
- Modales de confirmación antes de desactivar, activar o eliminar
- Hook useProducts + useAsync estable (evitar loops de refetch por deps inestables)

Extrae copy de confirmación a utilidad testeable (product-actions.ts).
```

### Reflexión

La primera versión tenía el filtro en "all" y no mostraba la columna Category. Revisé el PRD §5.1 y había una nota que yo mismo había escrito sobre "activos por defecto" — la IA no la tomó porque no estaba en el prompt, solo en el documento referenciado con `@docs`. A veces hay que repetir las cosas aunque estén en los docs.

El bug más feo del proyecto entero apareció aquí: loading infinito, ~450 requests en 10 segundos. Era el hook `useAsync` recibiendo `initialData: []` como array literal inline en cada render, lo que hacía que la referencia cambiara y disparara el efecto en loop. Lo resolvé con `fetcherRef`, `initialDataRef` y `deps` explícitas. La IA propuso la solución pero tardé un rato en entender por qué funcionaba — tuve que leerla con calma antes de aplicarla.

Las acciones Delete/Protected las diseñé yo basándome en el PRD. La IA implementó lo que le pedí pero el criterio de cuándo mostrar cada botón fue mío.

---

## Día 6 — Frontend: formulario de movimientos

### Contexto

El formulario de movimientos era el más complejo del frontend: preselección desde la lista, validación antes del submit, stock proyectado. Tenía claro que la validación de salida tenía que ir en tiempo real — si el usuario escribe 10 y el stock es 3, debería ver el error antes de hacer click.

### Prompt exacto

```
Actúa como Senior React Developer. Implementa MovementForm (US-06, TK-08) según @docs.

Requisitos:
- Autocomplete de productos activos (búsqueda por nombre o SKU)
- Preselección vía query ?productId= al llegar desde "Register movement" en la lista
- Tipo inbound/outbound; razones según tipo; cantidad entera positiva
- Si outbound: consultar stock del producto vía API al seleccionar y al cambiar cantidad
- Mostrar error y deshabilitar submit si quantity > currentStock
- Mostrar stock actual y stock proyectado con unidad de medida del producto
- Toast de éxito/error; ruta /movements/new

Extrae la lógica de validación a una utilidad testeable (validateMovementForm).
```

### Reflexión

La primera versión validaba solo en el submit. No era lo que pedí — releí mi propio prompt y sí lo había pedido ("al seleccionar y al cambiar cantidad"). El problema era que "en tiempo real" no estaba escrito explícitamente: decía "al cambiar cantidad" pero no decía que eso significaba un `onChange`. Segundo mensaje más directo: *"la validación debe ejecutarse en el evento onChange de quantity, no solo en el submit"*.

Pedir que extrajera `validateMovementForm` como utilidad pura fue la mejor decisión del día — permitió tests Vitest en el Día 8 sin montar el formulario completo.

También noté después, revisando los E2E del Día 10, que el autocomplete buscaba por nombre y eso rompía los tests cuando había productos con nombres similares en los fixtures. Tuve que volver a este componente y asegurarme de que la búsqueda por SKU funcionara como selector único. Ese acoplamiento no lo vi venir.

---

## Día 7 — Frontend: alta de producto e historial de movimientos

### Contexto

Me di cuenta a mitad de este día que el historial de movimientos existía como endpoint pero nunca lo había conectado a una pantalla. Llevaba 6 días trabajando y era la primera vez que lo notaba. Agregué `/movements` al nav de urgencia — no fue la parte más planificada del proyecto.

### Prompt exacto

```
Actúa como Senior React Developer. Implementa según @docs/PRD.md y US-05b, US-08.

ProductForm (/products/new):
- Campos: SKU, Name, Category, Unit of measure (units|kg|liters), Description (opcional), Price, Minimum stock
- Validación en tiempo real con class-validator equivalente en frontend
- POST /api/products; toast éxito; redirect al listado
- Edición en modal: incluir category y unitOfMeasure (SKU solo lectura)

MovementHistory (/movements):
- Tabla: Date, Product (name + SKU), Type, Reason, Quantity (con unidad)
- Filtros: producto, tipo (all/inbound/outbound), rango de fechas
- Hook useMovements consumiendo GET /api/movements
- Enlace en nav principal junto a "New Movement"

Tests Vitest para validación de producto y E2E Playwright para historial y link Register movement.
```

### Reflexión

La pantalla de historial quedó sin el filtro de producto activo en la primera versión — me devolvía todos los productos incluyendo inactivos y el dropdown se veía raro. Agregué un segundo prompt solo para ese detalle: reutilizar `useProducts({ statusFilter: 'all' })` en el select del filtro para que los inactivos con historial previo sigan siendo consultables.

Pedí explícitamente que los mocks de los tests incluyeran `category` y `unitOfMeasure` porque en el Día 8 anterior ya había visto cómo añadir un campo obligatorio rompe suites enteras si los mocks no lo tienen.

---

## Día 8 — Unitarias y Property-Based Testing

### Contexto

Con el núcleo estable después del refactoring del Día 7, necesitaba demostrar que las reglas de negocio no son casos sueltos sino propiedades universales. La rúbrica del curso habla de P1–P9 con fast-check y quería cubrirlos todos, no solo los más obvios.

### Prompt exacto

```
Actúa como QA Automation Engineer. Suite de pruebas backend (Día 8):

Jest — mínimo 10 unitarias con mocks TypeORM:
- Products: create OK (con category/unitOfMeasure), SKU duplicado, delete con movimientos (409), cambio de estado
- Movements: inbound OK, outbound stock OK/insuficiente, producto inactive, findAll con filtros
- Inventory: stock = Σinbound − Σoutbound; respuesta incluye category y unitOfMeasure

Frontend Vitest:
- validateProductForm / validateMovementForm
- StockBadge con unidad; ProductRowActions (Protected, Register movement link)
- useAsync sin loops de refetch

PBT con fast-check — propiedades P1–P9 en archivos *.pbt.spec.ts separados:
- P1: stock nunca negativo; borde quantity === currentStock en outbound
- P2: rechazar cantidad 0, negativa o decimal
- P3–P9: consistencia, SKU, estados, alertas (según rúbrica del curso)

Scripts: pnpm test y pnpm test:pbt. Mocks reutilizables en test-utils/.
```

### Reflexión

La primera corrida generó tests para P1 y P2 bien escritos, pero P3 en adelante eran básicamente variaciones de P1 con nombres distintos. No cubrían propiedades realmente independientes. Mandé un segundo prompt pidiendo auditoría contra la rúbrica punto por punto — *"revisa P3 a P9 y confirma qué propiedad distinta está verificando cada uno antes de generar código"*. Ahí mejoró bastante.

El problema técnico más tedioso: Jest configurado en `package.json` y en `jest.config.js` al mismo tiempo, con valores distintos. La IA lo había generado así porque en el Día 2 y el Día 8 eran sesiones separadas y no había consistencia. Tuve que resolver el conflicto manualmente.

En PBT aprendí que enunciar la propiedad en lenguaje natural en el prompt antes de pedir fast-check evita tests que solo repiten unitarias con datos aleatorios. Si le pides directamente "escribe un test PBT para stock" te da basura. Si le pides "la propiedad es: para cualquier secuencia válida de inbounds y outbounds, currentStock nunca puede ser negativo — implementa eso con fast-check" el resultado es útil.

---

## Día 9 — Mutation testing (Stryker)

### Contexto

Tenía cobertura alta tras el Día 8 pero sabía que cobertura alta no garantiza buenos tests. Quería saber específicamente si un cambio silencioso en el comparador de outbound (`<` a `<=`) sería detectado. Eso es exactamente el tipo de bug que se escapa en code review.

### Prompt exacto

```
Configura y ejecuta Stryker en backend (Día 9):

- @stryker-mutator/core + jest-runner, compatible con pnpm
- Mutar solo: products.service.ts, movements.service.ts, inventory.service.ts
- Excluir *.pbt.spec.ts del runner de Jest (timeouts)
- Foco en mutantes de validación outbound: comparadores, stock límite, tipos

Fase 2: por cada mutante sobreviviente, añade o ajusta unitarias hasta matarlo.
Entregables: stryker.conf.json, reporte HTML, resumen de score.
```

### Reflexión

El plugin de Jest no cargaba con pnpm — tiraba error de resolución de módulos. Estuve cerca de una hora probando versiones hasta que la IA me sugirió declararlo explícitamente en `testRunner` dentro de la config. No lo vi en ninguna documentación de Stryker, me lo dio el modelo después de describirle el error completo. Eso sí funcionó.

El score inicial fue ~72%, no el 90% que esperaba. Los mutantes que sobrevivían estaban en `findAll` con filtros y en `inventory.findOne` — casos donde los tests unitarios verificaban el camino feliz pero no las combinaciones de filtros vacíos. Añadí unitarias específicas para esos casos y el score subió a ~90%.

Un mutante que sobrevivió más tiempo del que me hubiera gustado: cambiar `>=` por `>` en la validación de outbound (el caso borde `quantity === currentStock`). Ningún test lo cubría porque ningún fixture usaba exactamente el stock disponible como cantidad. Lo maté añadiendo ese caso explícito.

Problema inesperado: `stryker-tmp/` rompía `docker compose build` porque Docker intentaba copiar esa carpeta gigante. La añadí a `.dockerignore`. La IA no lo mencionó — lo descubrí yo cuando el build tardó 8 minutos en lugar de 90 segundos.

---

## Día 10 — E2E con Playwright

### Contexto

Los unitarios no cubren flujos completos UI → API → DB. Necesitaba verificar los caminos que el usuario realmente recorre: crear un producto, verlo en la lista con el badge correcto, registrar un movimiento desde la fila.

### Prompt exacto

```
Actúa como QA Automation Engineer. Suite E2E Playwright (e2e/tests/inventory.spec.ts):

- Crear producto desde UI: incluir Category; verificar redirect y aparición en lista
- Listar producto con movimiento inbound: badge rojo con unidad ("3 units")
- Register movement desde fila: navega a /movements/new?productId= con producto preseleccionado
- Movimiento inbound OK; outbound bloqueado sin stock
- Historial /movements: movimiento visible con SKU, tipo y cantidad

API setup vía request.post con category y unitOfMeasure en todos los productos de prueba.
Base URL frontend localhost:5173; API localhost:3000/api.
```

### Reflexión

Los E2E fallaron desde el primer run porque los fixtures de API setup no enviaban `category` — el backend lo rechazaba con 400 y los tests nunca llegaban a ejecutar las acciones reales. Era un error mío: había actualizado el backend en el Día 3 para exigir `category` pero los fixtures del Día 10 eran nuevos y no lo incluían. Centralicé un objeto `defaultProduct` en el spec con todos los campos obligatorios y desde ahí se armaron todos los productos de prueba.

El test de preselección (`?productId=`) dependía de que el filtro por defecto de la lista fuera **active**. Si en algún momento alguien cambia ese default a "all", el test falla porque la fila esperada puede no estar en primer lugar. Lo dejé como comentario en el spec — es un acoplamiento real que no supe cómo evitar sin complicar demasiado el test.

La suite completa tardaba ~25 segundos en correr, lo cual me parece razonable para 5 flujos completos.

---