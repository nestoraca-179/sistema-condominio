# Sistema de Condominios

Aplicación web para la gestión operativa y financiera de condominios. El proyecto está dividido en dos aplicaciones independientes dentro del mismo repositorio: un backend API desarrollado con NestJS y un frontend desarrollado con React + Vite.

El sistema está orientado a distintos roles de usuario:

- Superadmin
- Administrador
- Contador
- Residente

Entre las funciones principales se incluyen autenticación, administración de condominios, estructura de edificios y unidades, gestión de cuotas, pagos, deudas, comunicados, reportes y control de tasa de cambio.

## Estructura del proyecto

```text
sistema-condominio/
├── backend/    # API REST con NestJS, TypeORM y PostgreSQL
├── frontend/   # Aplicación web con React, Vite y Tailwind CSS
└── README.md
```

## Requisitos

- Node.js 18 o superior
- npm 9 o superior
- PostgreSQL 15 o superior

## Puesta en marcha

### 1. Instalar dependencias

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 2. Configurar variables de entorno del backend

El backend usa un archivo `.env` con parámetros de base de datos, JWT, puerto y correo SMTP.

Variables esperadas:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=sistema_condominio

JWT_SECRET=dev_secret_key_do_not_use_in_production
JWT_EXPIRES_IN=8h

PORT=3000
NODE_ENV=development

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@sistemacondominio.com
```

### 3. Ejecutar el backend

```bash
cd backend
npm run start:dev
```

API disponible en `http://localhost:3000/api`

Documentación Swagger disponible en `http://localhost:3000/api/docs`

### 4. Ejecutar el frontend

```bash
cd frontend
npm run dev
```

Aplicación disponible en `http://localhost:5173`

## Backend

La carpeta `backend/` contiene una API REST construida con NestJS. Su responsabilidad es centralizar la lógica de negocio, la autenticación y el acceso a datos.

### Stack principal

- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- Passport JWT
- class-validator
- Swagger
- Nodemailer

### Organización principal

La aplicación está estructurada por módulos funcionales dentro de `src/modules/`:

- `auth`: autenticación y emisión de JWT
- `users`: gestión de usuarios y roles
- `condominiums`: administración de condominios
- `buildings`: sectores, edificios, torres y unidades
- `fees`: cuotas ordinarias y extraordinarias
- `payments`: registro e historial de pagos
- `debts`: control de deudas y moras
- `exchange-rates`: gestión de tasas de cambio
- `notices`: comunicados y registro de notificaciones
- `reports`: reportes administrativos y financieros
- `dashboard`: datos resumidos por perfil

También incluye una carpeta `src/common/` con guards, decoradores y utilidades compartidas.

### Base de datos

El backend usa PostgreSQL mediante TypeORM. La configuración se resuelve desde variables de entorno en `AppModule`, y la sincronización automática del esquema está habilitada cuando `NODE_ENV` no es `production`.

### Autenticación y seguridad

- Autenticación con JWT
- Guards por rol para restringir acceso a endpoints
- Validación global de DTOs con `ValidationPipe`
- Prefijo global `/api`
- CORS habilitado para el frontend local

### Usuario inicial

Durante el arranque, el backend intenta asegurar la existencia de un usuario administrador inicial. Si no existe un usuario `admin`, crea uno por defecto con estas credenciales:

- Usuario: `admin`
- Clave: `Admin123!`

Esto está pensado para desarrollo inicial. En un entorno real debe cambiarse inmediatamente.

### Scripts disponibles

```bash
npm run build       # Compila la aplicación
npm run start       # Inicia NestJS
npm run start:dev   # Inicia en modo desarrollo con watch
npm run start:debug # Inicia en modo debug
npm run start:prod  # Ejecuta la versión compilada
npm run lint        # Ejecuta eslint
npm run test        # Ejecuta pruebas con jest
```

## Frontend

La carpeta `frontend/` contiene la interfaz web del sistema. Es una SPA construida con React y organizada por páginas según el rol del usuario autenticado.

### Stack principal

- React 18
- TypeScript
- Vite
- React Router DOM
- Axios
- React Hook Form
- Zod
- Tailwind CSS
- Recharts

### Organización principal

La aplicación está estructurada en `src/` con estas áreas relevantes:

- `api/`: clientes HTTP por módulo
- `components/`: componentes reutilizables y layout
- `contexts/`: contexto de autenticación
- `pages/`: vistas por rol (`superadmin`, `admin`, `accountant`, `resident`)
- `types/`: definiciones TypeScript compartidas
- `utils/`: utilidades de apoyo

### Rutas y experiencia por rol

El frontend define rutas protegidas y redirecciones automáticas según el rol autenticado:

- `superadmin` accede al panel de condominios y usuarios globales
- `admin` accede a estructura, cuotas, pagos, deudas, comunicados y reportes
- `accountant` accede a tipo de cambio y estado de cuenta global
- `resident` accede a su panel, comunicados y perfil

### Comunicación con el backend

Vite está configurado para trabajar en desarrollo con un proxy hacia el backend:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Proxy de `/api` hacia `http://localhost:3000`

Esto permite consumir la API desde el navegador sin ajustar CORS manualmente para cada petición local.

### Autenticación en cliente

El contexto de autenticación almacena el token y los datos del usuario en `localStorage` usando:

- `access_token`
- `user`

Con esto se mantiene la sesión entre recargas del navegador.

### Scripts disponibles

```bash
npm run dev     # Inicia Vite en desarrollo
npm run build   # Compila TypeScript y genera el build de producción
npm run preview # Sirve el build generado
npm run lint    # Ejecuta eslint sobre src
```

## Flujo general del sistema

1. Un usuario inicia sesión desde el frontend.
2. El backend valida credenciales y devuelve un JWT.
3. El frontend guarda el token y habilita las rutas según el rol.
4. Los módulos del backend exponen endpoints para cuotas, pagos, deudas, reportes y comunicados.
5. El frontend consume esos endpoints por medio de clientes Axios segmentados por dominio.

## Notas de desarrollo

- El proyecto está preparado para desarrollo local desacoplado entre frontend y backend.
- El backend publica documentación Swagger automáticamente.
- El archivo `.env` del backend contiene datos sensibles y no debe versionarse.
- Antes de desplegar en producción deben revisarse credenciales, CORS, sincronización de TypeORM y secretos JWT.