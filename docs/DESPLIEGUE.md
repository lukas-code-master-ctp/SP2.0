# Despliegue

| Pieza | Dónde | Por qué |
|---|---|---|
| Web (Next.js) | Vercel, región São Paulo (`gru1`) | Cerca de la base de datos |
| Base de datos y documentos | Supabase, región São Paulo (`sa-east-1`) | Postgres + almacenamiento privado |
| Motor de obtención (`npm run worker`) | Google Cloud Run, Santiago (`southamerica-west1`) | TGR y otros sitios del Estado bloquean IPs extranjeras; los conectores usan un navegador y tardan minutos |

La web nunca ejecuta conectores en producción (`WORKER_INLINE=false`): solo crea trabajos en la tabla `Job`. El motor los toma con `FOR UPDATE SKIP LOCKED`, así que se puede escalar a varias instancias.

## 1. Supabase

1. Crear proyecto en región **South America (São Paulo)**.
2. *Storage* → crear bucket **privado** `documentos`.
3. *Project Settings → Database → Connection string*: copiar la URL con pooler (puerto 6543, agregar `?pgbouncer=true`) como `DATABASE_URL` y la de puerto 5432 como `DIRECT_URL`.
4. *Project Settings → API*: copiar `URL` (`SUPABASE_URL`) y la clave `service_role` (`SUPABASE_SERVICE_ROLE_KEY`, secreta).
5. Desde tu PC, con esas variables en `.env`:
   ```
   npm run db:migrate
   npm run db:seed
   ```

## 2. Vercel

1. *Add New → Project* → importar el repo de GitHub.
2. Variables de entorno: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (aleatorio, 32+ caracteres), `APP_URL` (la URL de Vercel o tu dominio), `PAYMENT_PROVIDER=mock`, `EMAIL_PROVIDER=console`, `WORKER_INLINE=false`, `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET=documentos`.
3. Deploy. Las migraciones se aplican a mano con `npm run db:migrate` antes de desplegar un cambio de esquema.

## 3. Motor en Cloud Run (Santiago)

Requiere un proyecto de Google Cloud con facturación y la CLI `gcloud`.

```
gcloud config set project <proyecto>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create sp2 --repository-format=docker --location=southamerica-west1
gcloud builds submit --config cloudbuild.worker.yaml --substitutions=_IMAGE=southamerica-west1-docker.pkg.dev/<proyecto>/sp2/motor
gcloud run deploy sp2-motor --image southamerica-west1-docker.pkg.dev/<proyecto>/sp2/motor --region southamerica-west1 --no-allow-unauthenticated --no-cpu-throttling --min-instances 1 --max-instances 1 --memory 2Gi --env-vars-file motor.env.yaml
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
```

`--no-cpu-throttling` y `--min-instances 1` mantienen el motor siempre despierto leyendo la cola.

### Prueba pendiente

No está verificado que la TGR acepte conexiones desde un datacenter en Chile. Tras desplegar, crear una solicitud con deuda de contribuciones y revisar en Supabase Storage la captura `solicitudes/<n>/_exploracion/tgr-1.png`. Si muestra "Página no encontrada", el plan B es correr el mismo contenedor (o `npm run worker`) en un VPS chileno o un equipo en la oficina: solo necesita las variables de arriba.

## Local

Con un proyecto de Supabase (o cualquier Postgres) en `.env`, `WORKER_INLINE=true` y `STORAGE_DRIVER=local`:
```
npm run db:migrate
npm run db:seed
npx next dev -p 3005
```
Para probar el motor separado: `WORKER_INLINE=false` y en otra terminal `npm run worker`.
