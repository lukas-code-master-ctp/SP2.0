# Despliegue

| Pieza | Dónde | Por qué |
|---|---|---|
| Web (Next.js) | Vercel, región São Paulo (`gru1`) | Cerca de la base de datos |
| Base de datos y documentos | Supabase, región São Paulo (`sa-east-1`) | Postgres + almacenamiento privado |
| Motor de obtención (`npm run worker`) | Google Cloud Run, Santiago (`southamerica-west1`) | Los conectores usan un navegador y tardan minutos; algunos sitios del Estado podrían bloquear IPs extranjeras |

La web nunca ejecuta conectores en producción (`WORKER_INLINE=false`): solo crea trabajos en la tabla `Job`. El motor los toma con `FOR UPDATE SKIP LOCKED`, así que se puede escalar a varias instancias.

## 1. Supabase

1. Crear proyecto en región **South America (São Paulo)**.
2. *Storage* → crear bucket **privado** `documentos`.
3. *Project Settings → Database → Connection string*: copiar la URL con pooler (puerto 6543, agregar `?pgbouncer=true`) como `DATABASE_URL` y la de puerto 5432 como `DIRECT_URL`.
4. `SUPABASE_URL` es `https://<ref>.supabase.co`. *Project Settings → API Keys → Secret keys*: copiar la clave `sb_secret_...` como `SUPABASE_SERVICE_ROLE_KEY` (también sirve la `service_role` antigua).
5. Las tablas y el seed se crean solos en el primer despliegue de producción en Vercel. Para hacerlo desde tu PC: `npm run db:migrate` y `npm run db:seed` con esas variables en `.env`.

## 2. Vercel

1. *Add New → Project* → importar el repo de GitHub.
2. Variables de entorno: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (aleatorio, 32+ caracteres), `APP_URL` (la URL de Vercel o tu dominio), `PAYMENT_PROVIDER=mock`, `EMAIL_PROVIDER=console`, `WORKER_INLINE=false`, `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET=documentos`.
3. Deploy. En producción, `npm run vercel-build` aplica las migraciones y el seed (idempotente) antes de `next build`; las vistas previas solo construyen.

## 3. Motor en Cloud Run (Santiago)

Requiere un proyecto de Google Cloud con facturación y la CLI `gcloud` con sesión iniciada (`gcloud auth login`).

Desde Windows, en la carpeta del proyecto, un script hace todo lo de abajo tomando las variables del `.env`:
```
powershell -ExecutionPolicy Bypass -File scripts\desplegar-motor.ps1 -Proyecto <proyecto>
```

Después, para que el motor se despliegue solo al fusionar en `main` (se hace una vez): conectar GitHub en la consola
de Cloud Build (región southamerica-west1, Repositorios 2ª gen, vincular `SP2.0`) y correr
`scripts\activar-autodespliegue.ps1 -Proyecto <proyecto>`. Crea el disparador `sp2-motor-main` con `cloudbuild.motor.yaml`,
que cambia solo la imagen: las variables quedan como las dejó `desplegar-motor.ps1`, así que si cambia el `.env`
hay que volver a correr ese script. Las rutas que aprende el agente viven en la base (`AgentMemory`) y no
necesitan despliegue.

A mano:

```
gcloud config set project <proyecto>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create sp2 --repository-format=docker --location=southamerica-west1
gcloud builds submit --config cloudbuild.worker.yaml --substitutions=_IMAGE=southamerica-west1-docker.pkg.dev/<proyecto>/sp2/motor
gcloud run deploy sp2-motor --image southamerica-west1-docker.pkg.dev/<proyecto>/sp2/motor --region southamerica-west1 --no-allow-unauthenticated --no-cpu-throttling --min-instances 1 --max-instances 1 --cpu 2 --memory 4Gi --env-vars-file motor.env.yaml
```

`motor.env.yaml` (no subirlo al repo):
```yaml
DATABASE_URL: "postgresql://...:6543/postgres?pgbouncer=true"
DIRECT_URL: "postgresql://...:5432/postgres"
SUPABASE_URL: "https://<ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY: "..."
SUPABASE_BUCKET: "documentos"
APP_URL: "https://<tu-app>.vercel.app"
EMAIL_PROVIDER: "console"
OPENROUTER_API_KEY: "..."          # agente de IA para documentos sin conector
OPENROUTER_MODEL: "anthropic/claude-haiku-5.5"
COMPANY_NAME: "SmartProp"          # datos del solicitante en los formularios
COMPANY_RUT: "78.031.812-0"
COMPANY_EMAIL: "documentos@smartprop.io"
COMPANY_REP_NAME: "..."           # representante: sitios que rechazan el RUT de empresa (SERVIU)
COMPANY_REP_RUN: "..."
WORKER_CONCURRENCY: "3"
```

`--no-cpu-throttling` y `--min-instances 1` mantienen el motor siempre despierto leyendo la cola.

### TGR

La TGR acepta conexiones desde datacenters, incluso fuera de Chile, pero rechaza navegadores que se anuncian como "HeadlessChrome" ("Página no encontrada" o "AccessDenied"). Por eso todos los navegadores del motor usan el User-Agent de Chrome de escritorio (`src/lib/fulfillment/browser.ts`). El formulario tiene un reCAPTCHA invisible; si Google llega a pedir el de casilla, el documento queda en "Requiere acción". Si algún emisor bloquea IPs, el proxy chileno se activa por documento con `PROXY_CL_URL` y `PROXY_CL_DOCS`.

## Local

Con un proyecto de Supabase (o cualquier Postgres) en `.env`, `WORKER_INLINE=true` y `STORAGE_DRIVER=local`:
```
npm run db:migrate
npm run db:seed
npx next dev -p 3005
```
Para probar el motor separado: `WORKER_INLINE=false` y en otra terminal `npm run worker`.
