# Tasks

## 1. Inicialización del proyecto

- [x] 1.1 Inicializar proyecto Next.js (App Router) en TypeScript con `pnpm create next-app` y verificar que `pnpm dev` levanta el servidor local sin errores
- [x] 1.2 Configurar Tailwind CSS y verificar que una clase utilitaria (ej. `bg-red-500`) se aplica correctamente en la página placeholder
- [x] 1.3 Configurar `pnpm` como gestor de paquetes (`packageManager` en `package.json`, lockfile `pnpm-lock.yaml`) y verificar que `pnpm install` reproduce el lockfile sin cambios

## 2. Página placeholder

- [x] 2.1 Crear una página raíz ("hola mundo") sin ninguna lógica de negocio y verificar que `pnpm build` compila sin errores de tipos ni de lint

El deploy a Vercel (conectar repo, primer deploy de producción) queda fuera de este ítem —
se hace en un ítem posterior del backlog, cuando el usuario tenga las cuentas de
GitHub/Vercel/Neon listas para conectar. Hasta entonces el desarrollo es 100% local.
