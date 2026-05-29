# Sindicato de Minibuses - Sistema Web

Bienvenido al nuevo sistema web de registro y control de afiliados para el **Sindicato de Minibuses - La Paz, Bolivia**.

Este proyecto ha sido generado utilizando **React (Vite)** e implementa una interfaz de usuario premium, dinámica y moderna (Glassmorphism, Dark Theme) utilizando Vanilla CSS puro, sin depender de Tailwind CSS.

## Optimizaciones de Base de Datos para Supabase
El esquema de la base de datos SQL original ha sido reestructurado para integrarse perfectamente con **Supabase**:

1. **Autenticación Integrada:**
   - La tabla `usuarios` ya no almacena contraseñas ni correos (`password_hash`, `email`). Ahora depende de la tabla nativa `auth.users` de Supabase utilizando un identificador `UUID` para conectar los perfiles.
2. **Seguridad RLS (Row Level Security):**
   - Se han habilitado políticas de seguridad por filas en todas las tablas sensibles (`personas`, `roles`, `usuarios`, `afiliados`).
   - Se agregaron políticas base para permitir el acceso mediante la función `auth.uid()`.
3. **Mantenimiento del Historial:**
   - Se han implementado tablas de `auditoria` y relaciones `ON DELETE CASCADE` donde corresponde.
4. **Relaciones en Módulos de Hacienda y Operaciones:**
   - Se ha conservado la estructura de relaciones y comprobantes para la caja, multas y asambleas.

El archivo optimizado se encuentra en la raíz del proyecto como: `supabase_schema.sql`.

## Requisitos
- Node.js (v16+)
- NPM

## Instalación y Ejecución

1. Instalar dependencias (ya instaladas durante la creación del proyecto):
```bash
npm install
```

2. Levantar el servidor de desarrollo:
```bash
npm run dev
```

El proyecto estará disponible en la URL indicada por Vite (generalmente `http://localhost:5173`).

## Stack Tecnológico Utilizado
- **Vite** como empaquetador rápido.
- **React** para la construcción de interfaces.
- **Lucide-React** para los iconos limpios y profesionales.
- **Supabase-js** preparado para conectar la aplicación al backend en la nube.
- **Vanilla CSS** con variables personalizadas y animaciones micro-interactivas.
