# User Stories — Sistema de Gestión de Inventario

---

## US-01: Crear producto (Backend)

**Como** administrador de inventario  
**Quiero** registrar un nuevo producto con nombre, SKU único, descripción, categoría, unidad de medida, precio y stock mínimo  
**Para** poder gestionar su existencia en el sistema.

```gherkin
Feature: Creación de productos
  Background:
    Given el endpoint POST /api/products está disponible

  Scenario: Crear un producto válido
    When envío una solicitud POST a /api/products con los siguientes datos:
      | nombre       | "Laptop Gamer X" |
      | sku          | "LPT-001"        |
      | descripcion  | "Laptop 16 GB RAM" |
      | categoria    | "Electronics"    |
      | unidadMedida | "units"          |
      | precio       | 1500.00          |
      | stockMinimo  | 5                |
    Then la respuesta tiene código 201
    And el cuerpo contiene los datos del producto creado
    And el producto tiene estado "activo" por defecto

  Scenario: Crear un producto con SKU duplicado
    Given existe un producto con SKU "LPT-001"
    When envío una solicitud POST a /api/products con SKU "LPT-001"
    Then la respuesta tiene código 409
    And el cuerpo contiene el mensaje "El SKU ya existe"

  Scenario: Crear un producto con precio negativo
    When envío una solicitud POST a /api/products con precio -100
    Then la respuesta tiene código 400
    And el cuerpo contiene un error de validación
```

---

## US-02: Cambiar estado de producto (Backend)

**Como** administrador de inventario  
**Quiero** activar o desactivar un producto  
**Para** controlar qué productos están disponibles para movimientos.

```gherkin
Feature: Cambio de estado de producto
  Background:
    Given existe un producto con ID 1 y estado "activo"

  Scenario: Desactivar un producto activo
    When envío una solicitud PATCH a /api/products/1/state con {"estado": "inactivo"}
    Then la respuesta tiene código 200
    And el producto pasa a estado "inactivo"

  Scenario: Activar un producto inactivo
    Given el producto con ID 1 está en estado "inactivo"
    When envío una solicitud PATCH a /api/products/1/state con {"estado": "activo"}
    Then la respuesta tiene código 200
    And el producto pasa a estado "activo"

  Scenario: Enviar un estado inválido
    When envío una solicitud PATCH a /api/products/1/state con {"estado": "congelado"}
    Then la respuesta tiene código 400
    And el cuerpo contiene un error de validación
```

---

## US-03: Eliminar producto sin movimientos (Backend — edge case)

**Como** administrador de inventario  
**Quiero** eliminar un producto solo si no tiene movimientos asociados  
**Para** mantener la integridad referencial del inventario.

```gherkin
Feature: Eliminación condicional de productos
  Background:
    Given existe un producto con ID 1
    And existe un producto con ID 2
    And existe un movimiento asociado al producto con ID 2

  Scenario: Eliminar producto sin movimientos
    When envío una solicitud DELETE a /api/products/1
    Then la respuesta tiene código 200
    And el producto con ID 1 ya no existe en la base de datos

  Scenario: Intentar eliminar producto con movimientos asociados
    When envío una solicitud DELETE a /api/products/2
    Then la respuesta tiene código 409
    And el cuerpo contiene el mensaje "No se puede eliminar el producto porque tiene movimientos asociados"
```

---

## US-04: Registrar movimiento de salida con validación de stock (Backend — edge case)

**Como** administrador de inventario  
**Quiero** registrar una salida de inventario solo si hay stock suficiente  
**Para** evitar registrar salidas que dejen el inventario en negativo.

```gherkin
Feature: Registro de movimientos con control de stock
  Background:
    Given existe un producto con ID 1
    And existe un movimiento de entrada de 10 unidades para el producto con ID 1

  Scenario: Registrar salida con stock suficiente
    When envío una solicitud POST a /api/movements con:
      | productoId | 1       |
      | tipo       | "salida" |
      | cantidad   | 3        |
      | razon      | "venta"  |
    Then la respuesta tiene código 201
    And el movimiento se registra correctamente

  Scenario: Registrar salida con stock insuficiente
    When envío una solicitud POST a /api/movements con:
      | productoId | 1       |
      | tipo       | "salida" |
      | cantidad   | 15       |
      | razon      | "venta"  |
    Then la respuesta tiene código 400
    And el cuerpo contiene el mensaje "Stock insuficiente para realizar la salida"

  Scenario: Registrar salida con cantidad cero o negativa
    When envío una solicitud POST a /api/movements con cantidad 0
    Then la respuesta tiene código 400
    And el cuerpo contiene un error de validación

  Scenario: Registrar movimiento para producto inactivo
    Given el producto con ID 1 está en estado "inactivo"
    When envío una solicitud POST a /api/movements para el producto 1
    Then la respuesta tiene código 400
    And el cuerpo contiene el mensaje "No se pueden registrar movimientos en un producto inactivo"
```

---

## US-05: Visualizar lista de productos con alerta de stock (Frontend)

**Como** administrador de inventario  
**Quiero** ver el listado de productos con el stock calculado y un indicador visual de alerta  
**Para** identificar rápidamente los productos con stock bajo.

```gherkin
Feature: Lista de productos con StockBadge
  Background:
    Given el backend expone GET /api/products/stock
    And existen 3 productos con distintos niveles de stock

  Scenario: Visualizar stock badge verde para producto con stock suficiente
    When el usuario accede a la pantalla de lista de productos
    Then el producto con stock >= stock mínimo muestra un badge de color verde
    And el badge contiene el texto del stock actual

  Scenario: Visualizar stock badge rojo para producto con stock crítico
    When el usuario accede a la pantalla de lista de productos
    Then el producto con stock < stock mínimo muestra un badge de color rojo
    And se muestra un icono de alerta junto al badge

  Scenario: Producto inactivo muestra badge gris
    Given existe un producto inactivo
    When el usuario accede a la pantalla de lista de productos
    Then el producto inactivo muestra un badge de color gris
    And el badge muestra el texto "Inactivo"
```

---

## US-05b: Crear producto desde la UI (Frontend)

**Como** administrador de inventario  
**Quiero** registrar un nuevo producto desde un formulario web  
**Para** dar de alta productos sin usar herramientas externas como Postman.

```gherkin
Feature: Formulario de alta de producto
  Background:
    Given el usuario está en la pantalla /products/new
    And el endpoint POST /api/products está disponible

  Scenario: Crear un producto válido
    When el usuario completa SKU "UI-001", nombre "Producto UI", categoría "Electronics", unidad "units", precio 25.50 y stock mínimo 3
    And envía el formulario
    Then se muestra el mensaje "Product created successfully."
    And el usuario es redirigido al listado de productos
    And el producto con SKU "UI-001" aparece en la tabla con categoría y unidad visibles

  Scenario: Validación en tiempo real de campos obligatorios
    When el usuario intenta enviar el formulario vacío
    Then se muestran errores para SKU, nombre y categoría
    And el botón "Save product" permanece deshabilitado

  Scenario: Mostrar error de SKU duplicado del backend
    Given existe un producto con SKU "UI-DUP"
    When el usuario intenta crear otro producto con SKU "UI-DUP"
    Then se muestra el mensaje de error "SKU already exists"
```

---

## US-06: Registrar movimiento con validación en tiempo real (Frontend)

**Como** administrador de inventario  
**Quiero** registrar un movimiento desde un formulario que valide el stock disponible en tiempo real  
**Para** evitar errores antes de enviar la solicitud al servidor.

```gherkin
Feature: Formulario de movimiento con validación en tiempo real
  Background:
    Given el usuario está en la pantalla de Nuevo Movimiento
    And existe un producto con ID 1 y stock actual de 10 unidades

  Scenario: Seleccionar producto y ver stock actual
    When el usuario selecciona el producto con ID 1
    Then se muestra el stock actual del producto (10 unidades)
    And el campo de cantidad está habilitado

  Scenario: Ingresar cantidad de salida válida
    When el usuario selecciona el producto con ID 1
    And selecciona tipo "Salida"
    And ingresa cantidad 5
    Then la validación en tiempo real muestra que la operación es válida
    And el botón "Guardar" está habilitado
    And el resumen muestra stock antes: 10 y stock después: 5

  Scenario: Ingresar cantidad de salida que supera el stock
    When el usuario selecciona el producto con ID 1
    And selecciona tipo "Salida"
    And ingresa cantidad 15
    Then la validación en tiempo real muestra el mensaje "Stock insuficiente"
    And el botón "Guardar" está deshabilitado
    And el borde del campo cantidad se muestra en rojo

  Scenario: Ingresar cantidad cero o negativa
    When el usuario selecciona tipo "Entrada"
    And ingresa cantidad 0
    Then la validación en tiempo real muestra el mensaje "La cantidad debe ser mayor a 0"
    And el botón "Guardar" está deshabilitado
```

---

## US-07: Lista de productos con categoría, unidad y acceso rápido a movimientos (Frontend)

**Como** administrador de inventario  
**Quiero** ver categoría y unidad de medida en el listado y registrar movimientos desde cada fila  
**Para** gestionar el inventario con el contexto completo del producto.

```gherkin
Feature: Lista de productos enriquecida
  Background:
    Given el usuario está en la pantalla de lista de productos

  Scenario: Filtro por defecto muestra solo productos activos
    When el usuario accede al listado
    Then el filtro de estado está en "Active"
    And solo se muestran productos activos

  Scenario: Columnas de categoría y unidad visibles
    Given existe un producto activo con categoría "Electronics" y unidad "kg"
    When el usuario accede al listado
    Then la fila del producto muestra categoría "Electronics"
    And la fila muestra unidad "kg"
    And el badge de stock incluye la unidad de medida

  Scenario: Registrar movimiento desde la fila
    Given existe un producto activo con ID 1
    When el usuario pulsa "Register movement" en la fila del producto
    Then navega a /movements/new?productId=1
    And el formulario de movimiento tiene preseleccionado el producto con ID 1
```

---

## US-08: Historial de movimientos con filtros (Frontend)

**Como** administrador de inventario  
**Quiero** consultar el historial de movimientos filtrado por producto, tipo y fechas  
**Para** auditar entradas y salidas del inventario.

```gherkin
Feature: Historial de movimientos
  Background:
    Given el endpoint GET /api/movements está disponible
    And existen movimientos registrados para distintos productos

  Scenario: Ver historial completo
    When el usuario accede a /movements
    Then se muestra una tabla con fecha, producto, tipo, razón y cantidad
    And cada cantidad incluye la unidad de medida del producto

  Scenario: Filtrar por producto
    Given existe un producto con SKU "HIST-001" y movimientos asociados
    When el usuario selecciona el producto "HIST-001" en el filtro
    Then la tabla muestra solo movimientos de ese producto

  Scenario: Filtrar por tipo de movimiento
    When el usuario selecciona tipo "Outbound" en el filtro
    Then la tabla muestra solo movimientos de salida
```
