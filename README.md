# SP Documentos

Plataforma para obtener la documentación de una propiedad en Chile (informe de títulos y
saneamiento) y generar el borrador del informe con IA.

Este repositorio contiene el **MVP (fase 1)**: cuentas, onboarding particular/empresa,
selección de trámite, región, comuna y rol, catálogo de documentos con precios, selección
del informe y checkout con una pasarela de pago simulada.
La arquitectura y las fases siguientes (agente IA, scrapers, pagos automáticos, informe
con OpenRouter) están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Prisma · SQLite (dev) / PostgreSQL (prod) · Tailwind CSS · Vitest

## Cómo correrlo

```bash
npm install
cp .env.example .env      # ajusta AUTH_SECRET
npm run db:push           # crea la base de datos
npm run db:seed           # regiones, 346 comunas, documentos y trámites
npm run dev               # http://localhost:3000
```

Pasarela simulada: cualquier tarjeta se aprueba salvo las terminadas en `0002`.
Los correos se imprimen en la consola del servidor.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (incluye lint y typecheck) |
| `npm test` | Tests unitarios (RUT, rol, requisitos y totales) |
| `npm run db:reset` | Borra la base y vuelve a cargar el seed |

## Estructura

```
prisma/            schema, seed y datos (regiones/comunas, catálogo)
src/app/           páginas y server actions
src/lib/           auth, reglas de negocio, pagos, correo, informes
docs/              arquitectura y plan por fases
```
