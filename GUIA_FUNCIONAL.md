# Guia Funcional del Sistema de Condominios

## Objetivo del documento

Esta guia describe como operar el sistema desde el punto de vista funcional. Su objetivo es que administradores, contadores, residentes y personal de soporte sepan como trabajar con cada seccion disponible en el frontend y entiendan el alcance real de los modulos implementados en backend y frontend.

La guia esta basada en las pantallas, rutas y modulos actualmente desarrollados en el proyecto.

## Alcance funcional actual

El sistema permite trabajar con estas areas:

- Inicio de sesion por usuario y rol.
- Gestion de condominios.
- Gestion de usuarios.
- Configuracion de estructura fisica: sectores, edificios, torres y unidades.
- Creacion y desactivacion de cuotas.
- Registro de pagos.
- Consulta de deudas y exoneracion de mora.
- Gestion de tasas de cambio.
- Publicacion de comunicados.
- Consulta de reportes y paneles resumen.
- Consulta de estado de cuenta del residente.

## Consideraciones importantes antes de operar

Antes de usar el sistema conviene tener claras estas reglas:

1. El acceso esta controlado por roles: `superadmin`, `admin`, `accountant` y `resident`.
2. Cada usuario operativo, salvo el `superadmin`, normalmente debe estar asociado a un condominio.
3. Las unidades habitacionales o funcionales se crean dentro de una estructura fisica compuesta por sectores, edificios o torres.
4. Las cuotas se crean por condominio y quedan disponibles para ser asociadas a pagos.
5. Los pagos pueden registrarse con o sin asociarlos a una cuota concreta.
6. La tasa de cambio se usa para convertir montos expresados en USD a bolivares al momento de crear cuotas o registrar pagos.
7. En el estado actual del sistema, las deudas no tienen una pantalla para creacion manual ni un flujo automatico visible desde frontend al crear cuotas. El sistema hoy permite consultarlas, actualizar montos desde backend y exonerar mora, pero no existe una operacion de “generar deuda” disponible para el usuario final desde las pantallas actuales.
8. En el estado actual del backend, registrar un pago no actualiza automaticamente una deuda existente. Operativamente, pagos y deudas deben interpretarse como procesos relacionados a nivel de negocio, pero no totalmente automatizados entre si en esta version.

## Flujo recomendado de configuracion inicial

Para poner a funcionar un condominio desde cero, el orden recomendado es este:

1. Iniciar sesion con un usuario `superadmin` o con el usuario inicial del sistema.
2. Crear el condominio.
3. Crear usuarios administrativos del condominio: administrador y contador.
4. Iniciar sesion como administrador del condominio.
5. Configurar la estructura fisica: sectores, edificios, torres y unidades.
6. Crear y asignar residentes.
7. Registrar la tasa de cambio si se trabajara con montos en USD.
8. Crear cuotas ordinarias o extraordinarias.
9. Registrar pagos.
10. Consultar deudas, reportes, comunicados y estados de cuenta segun el rol.

## Inicio de sesion

### Que hace esta seccion

La pantalla de acceso valida el `username` y la `password`, obtiene un token JWT y redirige automaticamente al usuario a su panel segun el rol.

### Como usarla

1. Abrir la aplicacion web.
2. Escribir el nombre de usuario.
3. Escribir la contrasena.
4. Presionar `Ingresar`.

### Resultado esperado

- `superadmin` entra al panel de superadministracion.
- `admin` entra al panel administrativo del condominio.
- `accountant` entra al panel del contador.
- `resident` entra a su panel personal.

### Usuario inicial de desarrollo

Si el sistema se inicializa sin un administrador previo, el backend crea un usuario base:

- Usuario: `admin`
- Clave: `Admin123!`

Este usuario debe cambiarse o complementarse con usuarios reales durante la configuracion inicial.

## Roles y responsabilidades funcionales

### Superadmin

Responsable de la administracion global del sistema.

Puede:

- Crear y editar condominios.
- Desactivar condominios.
- Crear usuarios de cualquier rol.
- Asignar usuarios a condominios.
- Consultar listados globales.

### Administrador

Responsable de la operacion diaria de un condominio.

Puede:

- Configurar estructura fisica.
- Crear usuarios del condominio.
- Crear cuotas.
- Registrar pagos.
- Consultar deudas.
- Exonerar mora.
- Publicar comunicados.
- Consultar reportes.

### Contador

Responsable del control financiero.

Puede:

- Registrar tasas de cambio.
- Consultar historico de tasas.
- Consultar estado de cuenta global.
- Consultar indicadores financieros.
- Consultar pagos y deudas desde reportes y paneles segun permisos.

### Residente

Responsable de consultar su informacion personal y operativa.

Puede:

- Ver su estado de cuenta.
- Consultar deudas visibles en su unidad.
- Ver historial de pagos.
- Leer comunicados.
- Actualizar su perfil.
- Cambiar su contrasena.

## Configuracion segun tipo de condominio

La estructura fisica del sistema esta pensada para soportar tres escenarios usando combinaciones de `sector`, `building`, `tower` y `unit`.

### 1. Condominio de apartamentos con edificios

Uso recomendado:

- Crear un registro por cada edificio usando tipo `building`.
- Si hay agrupaciones mayores, crear primero un `sector` y dentro de ese sector crear los edificios.
- Crear las unidades con nombres como `Apto 101`, `Apto 202` o similares.
- Asignar el piso en el campo `floor` cuando aplique.
- Asociar cada unidad a su propietario o residente cuando corresponda.

Ejemplo operativo:

1. Crear `Sector A`.
2. Crear `Edificio 1` con padre `Sector A`.
3. Crear `Apto 101`, `Apto 102`, `Apto 201` dentro de `Edificio 1`.

### 2. Conjunto residencial de casas

Uso recomendado:

- Crear un `sector` por calle, manzana o etapa si el conjunto se organiza de esa forma.
- Si no hay subdivisiones, se puede crear un unico `sector` general para todo el conjunto.
- Registrar cada casa como una unidad dentro del sector correspondiente.
- En `unit_number` usar nomenclaturas como `Casa 1`, `Casa 2`, `Quinta 14`, `Parcela C-3`.
- El campo `floor` puede quedar vacio si no aplica.

Ejemplo operativo:

1. Crear `Etapa 1` como `sector`.
2. Crear las unidades `Casa 1`, `Casa 2`, `Casa 3` dentro de `Etapa 1`.

### 3. Torre empresarial con oficinas

Uso recomendado:

- Crear la estructura principal como `tower` o `building`, segun la terminologia que maneje la organizacion.
- Si existen niveles o bloques, se pueden modelar como `sector` padre y luego `tower` o `building` hijos.
- Registrar cada oficina como una unidad.
- En `unit_number` usar etiquetas como `Oficina 3A`, `Oficina 402`, `Local PB-1`.
- El campo `floor` debe usarse para reflejar el nivel o planta cuando sea relevante.

Ejemplo operativo:

1. Crear `Torre Norte` como `tower`.
2. Crear `Oficina 101`, `Oficina 102`, `Oficina 305` dentro de `Torre Norte`.

### Regla general de modelado

Si la propiedad genera obligaciones y pagos individuales, debe existir como `unidad`. La jerarquia superior solo sirve para organizar y segmentar el inmueble.

## Guia funcional por secciones del frontend

## Superadmin

### Panel Superadministrador

#### Objetivo

Mostrar una vista general del sistema con conteos globales.

#### Que puede hacer el usuario

- Ver el total de condominios registrados.
- Ver el total de usuarios registrados.

#### Uso operativo

Esta pantalla sirve como resumen inicial. No es una pantalla transaccional, sino informativa.

### Condominios

#### Objetivo

Crear, editar y desactivar condominios del sistema.

#### Datos que maneja

- Nombre del condominio.
- RIF.
- Direccion.
- Estado activo o inactivo.

#### Como usarla

1. Presionar `+ Nuevo Condominio`.
2. Completar nombre, RIF y direccion.
3. Guardar.
4. Para corregir datos, usar `Editar`.
5. Para sacar un condominio de operacion, usar `Desactivar`.

#### Resultado funcional

El condominio queda disponible para asociar usuarios, estructura fisica, cuotas, pagos, comunicados y reportes.

#### Buenas practicas

- No crear condominios duplicados con variaciones del nombre.
- Mantener el RIF como identificador administrativo unico.

### Usuarios del Sistema

#### Objetivo

Administrar usuarios globales y asignarlos a condominios.

#### Roles que puede crear

- Superadmin
- Administrador
- Contador
- Residente

#### Datos que maneja

- Nombre completo.
- Username.
- Email.
- Telefono.
- Contrasena.
- Rol.
- Condominio asignado.

#### Como usarla

1. Presionar `+ Nuevo Usuario`.
2. Elegir el rol.
3. Asignar condominio si no es superadmin.
4. Completar datos personales.
5. Guardar.

#### Reglas funcionales

- Si el campo `username` se deja vacio, el sistema intenta generarlo automaticamente.
- El email debe ser unico.
- Un usuario inactivo no podra iniciar sesion.

#### Recomendacion operativa

Despues de crear un condominio, esta es la siguiente pantalla que debe usarse para crear al administrador responsable y, si aplica, al contador.

## Administrador

### Panel Administrador

#### Objetivo

Mostrar indicadores operativos y financieros del condominio.

#### Que muestra

- Total de unidades habitacionales o funcionales.
- Cantidad de cuotas activas.
- Monto recaudado del mes en bolivares.
- Cantidad de pagos del mes.

#### Uso operativo

Sirve para validar rapidamente si la estructura, la cobranza y la actividad mensual del condominio ya estan cargadas.

### Usuarios del Condominio

#### Objetivo

Administrar usuarios internos del condominio actual.

#### Roles disponibles

- Administrador
- Contador
- Residente

#### Como usarla

1. Crear primero usuarios residentes que luego puedan asignarse a unidades.
2. Crear usuarios contadores si el condominio separa esa funcion.
3. Editar datos cuando cambie correo, telefono o username.
4. Desactivar usuarios que ya no deban tener acceso.

#### Relacion con otras areas

Los residentes creados aqui pueden seleccionarse luego como propietarios o responsables de unidades dentro de la pantalla de estructura.

### Estructura Fisica

#### Objetivo

Configurar la estructura del inmueble y registrar las unidades que seran objeto de cobranza, pagos y consulta.

#### Que permite crear

- Sectores
- Edificios
- Torres
- Unidades

#### Flujo recomendado de uso

1. Crear primero la jerarquia superior: sectores, edificios o torres.
2. Si una estructura depende de otra, usar el campo `Depende de` para relacionarla.
3. Crear despues las unidades.
4. Asignar propietario cuando ya exista el usuario residente.

#### Datos de una estructura superior

- Nombre.
- Tipo: `sector`, `building` o `tower`.
- Padre opcional.

#### Datos de una unidad

- Estructura a la que pertenece.
- Numero o nombre de unidad.
- Piso.
- Propietario opcional.

#### Casos de uso tipicos

- Apartamentos: `Edificio 1` -> `Apto 101`.
- Casas: `Sector Los Robles` -> `Casa 12`.
- Oficinas: `Torre A` -> `Oficina 701`.

#### Resultado funcional

Las unidades creadas aqui alimentan otras areas del sistema, especialmente pagos, deudas, reportes y paneles.

### Cuotas

#### Objetivo

Crear conceptos de cobro del condominio.

#### Tipos de cuota

- Ordinaria
- Extraordinaria

#### Datos que maneja

- Concepto o nombre.
- Tipo de cuota.
- Moneda original (`VES` o `USD`).
- Monto original.
- Equivalente en bolivares.
- Fecha de vencimiento.

#### Como usarla

1. Verificar si la tasa de cambio actual ya esta cargada cuando la cuota sera en USD.
2. Presionar `+ Nueva Cuota`.
3. Indicar concepto, tipo, moneda, monto y vencimiento.
4. Confirmar el equivalente en bolivares mostrado por el sistema.
5. Guardar.

#### Resultado funcional

La cuota queda registrada y puede asociarse a pagos posteriores.

#### Consideracion importante

En la version actual, crear una cuota no genera automaticamente una deuda visible para cada unidad desde las pantallas existentes. La cuota funciona como concepto de cobro, pero la materializacion de la deuda no esta expuesta como flujo automatico de usuario.

### Pagos

#### Objetivo

Registrar pagos realizados por las unidades del condominio.

#### Datos que maneja

- Unidad que paga.
- Cuota asociada, opcional.
- Moneda del pago.
- Monto original.
- Equivalente en bolivares.
- Fecha de pago.
- Numero de comprobante.
- Notas.

#### Como usarla

1. Verificar que la unidad exista en la estructura.
2. Verificar que la cuota exista si el pago se imputara a una cuota concreta.
3. Presionar `+ Registrar Pago`.
4. Seleccionar la unidad.
5. Seleccionar la cuota si aplica. Si no aplica, dejarlo como `Pago general / abono`.
6. Seleccionar moneda y monto.
7. Revisar el equivalente en bolivares mostrado por el sistema.
8. Cargar fecha, referencia y notas.
9. Guardar.

#### Resultado funcional

El pago queda registrado en el historial del condominio y alimenta paneles e indicadores financieros.

#### Consideracion importante

En el estado actual del backend, el pago no actualiza automaticamente una deuda ya registrada. Si la organizacion necesita conciliacion automatica deuda-pago, ese flujo debe implementarse adicionalmente.

### Deudas y Moras

#### Objetivo

Consultar deudas existentes y exonerar mora cuando corresponda.

#### Que muestra

- Unidad.
- Propietario.
- Cuota asociada.
- Fecha de vencimiento.
- Monto original.
- Mora.
- Total pendiente.
- Estado.

#### Accion disponible

- `Exonerar mora`.

#### Como usarla

1. Entrar a la pantalla de deudas.
2. Revisar unidades pendientes.
3. Si la administracion decide retirar el recargo, usar `Exonerar mora`.

#### Alcance actual

- La pantalla esta preparada para consulta y exoneracion.
- No existe en frontend un formulario para crear deudas manualmente.
- No existe en frontend un flujo de aplicacion manual de mora distinto a la exoneracion.

#### Interpretacion operativa recomendada

Use esta pantalla como tablero de seguimiento de saldos ya generados por carga previa, procesos administrativos externos o futuras extensiones del sistema.

### Comunicados

#### Objetivo

Emitir avisos informativos para los residentes del condominio.

#### Datos que maneja

- Titulo.
- Contenido.
- Tipo de destinatario.
- Envio opcional por email.

#### Destinatarios soportados

- Todos los residentes.
- Por sector.
- Por edificio.

#### Como usarla

1. Presionar `+ Nuevo Comunicado`.
2. Escribir titulo y contenido.
3. Elegir el tipo de destinatario.
4. Si se desea, marcar envio por correo.
5. Publicar.

#### Resultado funcional

El comunicado queda visible para consulta desde la interfaz. Si SMTP esta configurado y se suministran destinatarios, tambien puede enviarse por correo.

#### Consideracion importante

La capacidad real de envio por email depende de que el backend tenga configurados `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`.

### Reporte Financiero

#### Objetivo

Consultar pagos del condominio dentro de un rango de fechas.

#### Que muestra

- Pagos incluidos en el periodo.
- Unidad y propietario.
- Cuota asociada.
- Monto original.
- Monto en bolivares.
- Fecha.
- Referencia.

#### Como usarla

1. Indicar fecha `Desde` y `Hasta`.
2. Presionar `Generar Reporte`.
3. Revisar totales y detalle de pagos.

#### Uso recomendado

Esta pantalla es util para cierres mensuales, revision de recaudacion y control administrativo.

## Contador

### Panel Contador

#### Objetivo

Mostrar indicadores financieros y una vista resumida de recaudacion por unidades.

#### Que muestra

- Recaudado del mes.
- Tasa actual.
- Numero de pagos del mes.
- Grafico de unidades con mayor recaudacion.

#### Uso operativo

Sirve para monitorear la salud financiera del condominio y detectar unidades o periodos con mayor movimiento.

### Tasa de Cambio

#### Objetivo

Registrar y consultar tasas de cambio para operaciones expresadas en USD.

#### Que muestra

- Tasa actual.
- Fecha efectiva.
- Historial de tasas.
- Usuario que la registro.

#### Como usarla

1. Presionar `+ Registrar Tasa`.
2. Indicar la tasa en bolivares por 1 USD.
3. Indicar la fecha efectiva.
4. Guardar.

#### Uso recomendado

Registrar la tasa antes de crear cuotas o pagos en USD para que la equivalencia en bolivares refleje el criterio operativo vigente.

### Estado de Cuenta Global

#### Objetivo

Consultar la recaudacion total por unidad en un ano o mes determinado.

#### Que muestra

- Unidad.
- Propietario.
- Total recaudado en bolivares.
- Numero de pagos.

#### Como usarla

1. Indicar el ano.
2. Indicar el mes si se desea filtrar por periodo mensual.
3. Presionar `Consultar`.
4. Revisar el total general y el detalle por unidad.

#### Uso recomendado

Util para conciliacion mensual, auditoria operativa y seguimiento de cobranza por unidad.

## Residente

### Mi Estado de Cuenta

#### Objetivo

Permitir al residente consultar su situacion financiera y sus pagos registrados.

#### Que muestra

- Saldo pendiente total.
- Numero de deudas pendientes.
- Total pagado.
- Cuotas pendientes.
- Historial de pagos.

#### Como usarla

1. Iniciar sesion con el usuario residente.
2. Revisar el bloque resumen superior.
3. Consultar las cuotas pendientes.
4. Verificar el historial de pagos registrados.

#### Condicion necesaria

El usuario residente debe tener una unidad asociada. Si no la tiene, el sistema muestra un mensaje indicando que debe contactar a la administracion.

### Comunicados

#### Objetivo

Permitir al residente leer avisos publicados por la administracion.

#### Como usarla

1. Entrar a `Comunicados`.
2. Revisar el listado.
3. Hacer clic en un comunicado para abrir el contenido completo.

### Mi Perfil

#### Objetivo

Permitir al residente mantener actualizados sus datos y cambiar su contrasena.

#### Datos que puede actualizar

- Nombre completo.
- Username.
- Email.
- Telefono.
- Contrasena.

#### Como usarla

1. Entrar a `Mi Perfil`.
2. Modificar datos personales y guardar.
3. Para cambiar contrasena, completar nueva contrasena y confirmacion.
4. Guardar cambios.

## Relacion funcional entre frontend y backend

Cada area del frontend consume modulos especificos del backend:

- Login usa `auth`.
- Condominios usa `condominiums`.
- Usuarios usa `users`.
- Estructura usa `buildings`.
- Cuotas usa `fees`.
- Pagos usa `payments`.
- Deudas usa `debts`.
- Tasa de cambio usa `exchange-rates`.
- Comunicados usa `notices`.
- Reportes y paneles usan `reports` y `dashboard`.

Esto significa que la operacion visible en frontend depende directamente de esas capacidades expuestas en backend.

## Orden de uso recomendado para una operacion mensual

Un ciclo operativo tipico del sistema deberia seguir esta secuencia:

1. Verificar que las unidades y residentes esten correctos.
2. Registrar o actualizar la tasa de cambio del periodo, si aplica.
3. Crear las cuotas del periodo.
4. Registrar pagos a medida que se reciben.
5. Consultar deudas y moras existentes.
6. Publicar comunicados si hay recordatorios, avisos o cierres.
7. Revisar paneles y reportes al cierre del periodo.

## Limitaciones funcionales actuales

Para operar correctamente el sistema, es importante considerar estas limitaciones de la version actual:

1. No existe pantalla para generar deudas manualmente.
2. No existe automatizacion visible que cree deudas para todas las unidades al crear una cuota.
3. No existe conciliacion automatica visible entre pago registrado y deuda pendiente.
4. La segmentacion avanzada de comunicados por destinatarios concretos no esta expuesta completamente en la interfaz, aunque backend soporta parametros de destinatarios.
5. La estructura fisica soporta `sector`, `building` y `tower`; no existe un tipo separado para `casa` u `oficina`, por lo que esas variantes deben modelarse como unidades.

## Recomendaciones de operacion

1. Definir una convencion de nombres para sectores, edificios, torres y unidades antes de cargar informacion.
2. Registrar primero usuarios residentes y luego asociarlos a unidades.
3. Mantener actualizada la tasa de cambio antes de crear operaciones en USD.
4. Usar las cuotas como catalogo de conceptos de cobro y los pagos como registro formal de recaudacion.
5. Si el condominio requiere manejo riguroso de deuda automatizada, considerar como siguiente mejora la generacion de deudas por cuota y la aplicacion automatica de pagos a saldos.

## Resumen ejecutivo de uso

En la practica, el sistema se usa asi:

1. El superadmin crea condominios y usuarios base.
2. El administrador configura estructura, usuarios residentes, cuotas, pagos y comunicados.
3. El contador mantiene la tasa de cambio y consulta reportes financieros.
4. El residente consulta su estado de cuenta, pagos y comunicados.

Con esa secuencia, el sistema cubre la administracion basica y financiera del condominio dentro del alcance actualmente implementado.