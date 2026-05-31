# 3.2.3 Etapa 3: Diseño

En esta etapa se define la arquitectura visual, la estructura de la información y la gestión de reportes del "Sistema Web Integrado para el Sindicato de Minibuses". El diseño está enfocado en la usabilidad, la rapidez de respuesta y la integridad de los datos.

## A) Diseño de las interfaces de E/S (Pantallas de Entrada/Salida)

Las interfaces han sido diseñadas bajo el paradigma *Mobile-First* y *Responsive Design* utilizando React y CSS moderno. Las pantallas principales incluyen:

1. **Pantalla de Autenticación (Login - Entrada):**
   - **Entrada:** Credenciales del usuario (Email y Contraseña).
   - **Salida:** Redireccionamiento al Dashboard correspondiente según el rol (Administrador, Cajero, Controlador, Secretario).

2. **Panel de Control de Campo (Controlador - Entrada/Salida):**
   - **Entrada:** Interfaz optimizada para dispositivos táctiles (teléfonos). Permite el ingreso rápido del número de placa o disco. Cuenta con botones de acción directa para infracciones comunes ("ATRASO", "ADELANTO").
   - **Salida:** Confirmación visual instantánea del registro de la multa y visualización de la lista de las últimas infracciones emitidas en el turno con opciones de condonación.

3. **Módulo de Gestión de Afiliados y Vehículos (Entrada/Salida):**
   - **Entrada:** Formularios estructurados para el registro de datos personales (CI, Nombres, Teléfono), datos de afiliación y registro de parque automotor (Placa, Disco, Marca, Modelo).
   - **Salida:** Tablas dinámicas con filtros de búsqueda en tiempo real, perfiles detallados de cada afiliado y sus respectivos choferes de relevo.

4. **Módulo de Cobranza y Caja (Entrada/Salida):**
   - **Entrada:** Buscador por CI o Placa para localizar cuentas por cobrar. Botones de selección múltiple para liquidar cuotas y multas.
   - **Salida:** Resumen de deuda (Estado de cuenta), generación del código de recibo, y pantalla de confirmación de pago.

---

## B) Diseño de Reportes

El sistema contempla la generación de reportes operativos y gerenciales clave para la directiva del sindicato, diseñados para ser exportables a formatos estándar (PDF/Excel) o visualizados en pantalla:

1. **Recibo de Pago (Comprobante de Caja):**
   - Reporte transaccional generado inmediatamente tras el cobro. Detalla el Nro. de Recibo, fecha, afiliado, detalle de ítems pagados (cuotas/multas) y el monto total en bolivianos.

2. **Reporte de Estado de Cuenta (Deudores):**
   - Reporte que lista a los afiliados que presentan morosidad. Muestra el detalle de meses impagos (Cuotas Sindicales) y multas acumuladas (faltas a asambleas, atrasos de tarjeta).

3. **Reporte Diario de Recaudación (Cierre de Caja):**
   - Reporte que consolida los ingresos diarios de un usuario cajero específico. Muestra el total recaudado, desglosado por concepto (Aportes vs. Infracciones) y métodos de pago.

4. **Reporte de Control Operativo (Controlador):**
   - Resumen de las multas emitidas por un controlador en su turno, especificando placa del vehículo, tipo de infracción (Atraso/Adelanto/Trameaje) y estado de la multa (Pendiente/Pagado/Condonado).

---

## C) Diseño de la Base de Datos

La base de datos centralizada se aloja en **PostgreSQL** (Supabase), estructurada para garantizar el aislamiento de datos (Row Level Security) y la integridad referencial.

### Modelo Relacional (Normalizado)

El diseño de la base de datos cumple con la Tercera Forma Normal (3FN). Las entidades y sus atributos clave son:

**1. Entidades de Seguridad y Usuarios**
* **roles**: `PK(id_rol)`, nombre_rol.
* **personas**: `PK(id_persona)`, ci, nombres, paterno, materno, telefono.
* **usuarios**: `PK(id_usuario)`, `FK(id_persona)`, `FK(id_rol)`, email, password_hash.

**2. Entidades de Afiliación y Parque Automotor**
* **afiliados**: `PK(id_afiliado)`, `FK(id_persona)`, numero_afiliado, fecha_ingreso.
* **vehiculos**: `PK(id_vehiculo)`, `FK(id_propietario -> id_afiliado)`, numero_disco, placa, marca, estado.
* **chofer_vehiculo**: `PK(id_chofer, id_vehiculo)`, `FK(id_chofer -> id_afiliado)`, fecha_inicio, estado.

**3. Entidades de Obligaciones (Deudas)**
* **tipos_cuota**: `PK(id_tipo_cuota)`, concepto.
* **tipos_multa**: `PK(id_tipo_multa)`, concepto, categoria.
* **cuotas**: `PK(id_cuota)`, `FK(id_afiliado)`, `FK(id_tipo_cuota)`, monto_bs, estado.
* **multas**: `PK(id_multa)`, `FK(id_afiliado)`, `FK(id_usuario_emisor)`, `FK(id_tipo_multa)`, monto_bs, estado.

**4. Entidades de Tesorería y Transacciones**
* **pagos**: `PK(id_pago)`, `FK(id_afiliado)`, `FK(id_usuario_cobrador)`, monto_total_bs, fecha_pago, recibo_nro.
* **detalle_pagos**: `PK(id_detalle)`, `FK(id_pago)`, `FK(id_cuota)`, `FK(id_multa)`, subtotal_bs.
