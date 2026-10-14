# Arquitectura y plan por fases

Plataforma para que personas y empresas obtengan la documentación de una propiedad en Chile
(informe de títulos y saneamiento) y, opcionalmente, un borrador del informe generado con IA.

## Flujo del cliente (pasos 1 a 19)

| Paso | Qué ocurre | Fase | Dónde está |
|---|---|---|---|
| 1 | Crear cuenta | 1 ✅ | `src/app/(auth)/registro`, `src/app/actions/auth.ts` |
| 2 | Elegir particular o empresa | 1 ✅ | `src/app/onboarding/page.tsx` |
| 3 | Datos iniciales según tipo (RUT validado) | 1 ✅ | `src/app/onboarding/datos` |
| 4-5 | Iniciar trámite y elegirlo | 1 ✅ | `src/app/app/tramites/nuevo` |
| 6-7 | Región, comuna (346 comunas) y rol | 1 ✅ | idem, `src/lib/rol.ts` |
| 8-9 | Lista de documentos requeridos, todos marcados, se pueden desmarcar | 1 ✅ | `src/app/app/solicitudes/[id]/documentos`, `src/lib/requirements.ts` |
| 10 | Valor total (gratis y de pago) | 1 ✅ | `computeTotals` |
| 11 | Agregar borrador de informe de títulos o informe de saneamiento | 1 ✅ | idem |
| 12-13 | Ir a pagar e ingresar tarjeta | 1 ✅ (simulado) | `src/lib/payments`, `src/app/pago/simulado` |
| 14 | Aviso "en proceso" + correo de confirmación | 1 ✅ | `src/lib/requests.ts#markRequestPaid` |
| 15 | Agente IA mapea la ruta y genera un scraper reutilizable; si falla, el agente lo hace y re-mapea | 2 | diseño abajo |
| 16 | Pago automático de cada documento | 2 | diseño abajo |
| 17 | Guardar documentos en la carpeta de la solicitud | 2 | diseño abajo |
| 18 | Generar el informe con OpenRouter | 3 | `src/lib/reports/openrouter.ts` (implementado, no conectado) |
| 19 | Correo "está listo" con link a resultados | 2 | plantilla en `src/lib/email` |

## Componentes

```
                 ┌──────────────────────────── Web (Next.js) ───────────────────────────┐
 Cliente ──────▶ │ Cuentas · Onboarding · Trámite · Selección docs · Checkout · Estado  │
                 └───────────────┬───────────────────────────────┬───────────────────────┘
                                 │ Prisma                        │ webhook pago
                                 ▼                               ▼
                         ┌──────────────┐               ┌────────────────┐
                         │  PostgreSQL  │               │ Webpay / Flow  │
                         └──────┬───────┘               └────────────────┘
                                │ job "obtener solicitud"
                                ▼
            ┌──────────── Orquestador de obtención (worker, fase 2) ────────────┐
            │ por cada documento:                                               │
            │   1. ¿hay receta (scraper) vigente para emisor+documento?         │
            │        sí → ejecutar receta en Playwright                         │
            │        no / falla → Agente IA navega, obtiene el doc y            │
            │                     graba una receta nueva (versión N+1)          │
            │   2. pagar derechos si corresponde (billetera / tarjeta virtual)  │
            │   3. validar el PDF (OCR + checks) y guardarlo en storage         │
            └─────────────────────────────────────┬─────────────────────────────┘
                                                  ▼
                       Storage (S3/R2): solicitudes/{número}-{rol}/documento.pdf
                                                  ▼
                       Generador de informe (OpenRouter, fase 3) → correo al cliente
```

## Modelo de datos (resumen)

- `User` + `PersonProfile` / `CompanyProfile`: cuenta y datos según tipo.
- `Region`, `Comuna`: catálogo oficial.
- `Procedure` (INFORME_TITULO, SANEAMIENTO) con precio del informe.
- `DocumentType`: catálogo de documentos, emisor y precio.
- `ProcedureRequirement`: qué documentos pide cada trámite. Puede acotarse a región o comuna
  y excluir documentos (lo más específico gana). Así se modela que cada comuna tiene su CBR y su DOM.
- `Request` (solicitud) + `RequestItem` (documento pedido, precio congelado, estado y archivo).
- `Payment`: intento de pago. Nunca se guarda el número de tarjeta, solo los últimos 4 dígitos.
- `RequestEvent`: bitácora visible para el cliente y para auditoría.

## Fase 2: agente, scrapers y pagos automáticos

### Recetas de obtención (scrapers versionados)

Cada combinación **emisor + documento** (por ejemplo "CBR Santiago · dominio vigente",
"SII · avalúo detallado") tiene una **receta**: una secuencia declarativa de pasos
(`goto`, `fill`, `click`, `waitFor`, `download`, `pay`) con selectores y parámetros
(`{rol}`, `{comuna}`, `{rut}`), guardada en BD con versión, tasa de éxito y última ejecución.

Se prefiere una receta declarativa (JSON) en vez de código generado porque se puede
validar, versionar, diffear y ejecutar en un runner controlado sin ejecutar código arbitrario.

Nuevas tablas: `Issuer` (CBR Santiago, SII, TGR, DOM Ñuñoa…), `ComunaIssuer` (qué CBR/DOM
corresponde a cada comuna), `Recipe` (issuer, documentType, version, steps JSON, status),
`RecipeRun` (resultado, duración, screenshot/trace en caso de error).

### Ciclo agente ⇄ scraper

1. El worker toma el `RequestItem` y busca la receta activa.
2. Ejecuta la receta en Playwright (navegador headless aislado por job).
3. Si falla (selector no encontrado, cambio de página, captcha): se marca la receta como
   `degradada` y se lanza el **agente**: un LLM con herramientas de navegador
   (Playwright vía MCP o computer-use) que recibe el objetivo ("descarga el certificado de
   avalúo detallado para rol X en comuna Y") y la receta anterior como pista.
4. Mientras navega, cada acción exitosa se graba como paso. Si obtiene el documento,
   se guarda la secuencia como receta versión N+1 (queda en `revisión` las primeras K
   ejecuciones y se promueve a `activa` si mantiene éxito).
5. Si el agente tampoco lo logra, el ítem pasa a `FALLIDO` y entra a una cola de
   **operación humana** con el trace para que alguien lo resuelva (y se grabe la receta).

Captchas: usar los canales oficiales cuando existan (muchos CBR y municipios tienen
convenios o APIs para empresas), y como alternativa un servicio de resolución con
revisión de términos de uso de cada sitio.

### Pagos automáticos de documentos (paso 16)

Opciones, de más a menos recomendable:

1. **Convenios / cuentas empresa** con los emisores que lo permiten (varios CBR ofrecen
   cuenta corriente o prepago a empresas): el agente no maneja tarjetas.
2. **Tarjetas virtuales de un solo uso** emitidas por API (proveedores de tarjetas
   corporativas) con monto máximo = precio esperado del documento. Si el monto cobrado
   difiere, se detiene y escala a un humano.
3. **Aprobación humana** (human-in-the-loop) para emisores nuevos o montos fuera de rango.

En todos los casos el pago del cliente (paso 13) y el pago a los emisores (paso 16) son
flujos separados y conciliados por `RequestItem`.

### Carpeta de la solicitud (paso 17)

Bucket S3/R2 con la ruta `solicitudes/{número}-{rol}/`, un PDF por documento y un
`manifest.json` (emisor, fecha, hash SHA-256, receta usada). El cliente descarga con URLs
firmadas de corta duración desde la página de la solicitud.

### Infraestructura

- Cola: BullMQ + Redis (reintentos con backoff, un job por documento).
- Workers Playwright en contenedores separados de la web (Fly.io / Railway / ECS).
- Observabilidad: trace de Playwright y screenshot por ejecución fallida.

## Fase 3: informe con IA (paso 18)

1. OCR/extracción de texto de cada PDF.
2. Prompt estructurado por tipo de trámite (plantilla de informe de títulos / saneamiento)
   enviado a OpenRouter (`src/lib/reports/openrouter.ts`), exigiendo citar el documento fuente.
3. Se guarda como borrador (DOCX/PDF) en la carpeta, marcado para revisión de abogado.
4. Correo al cliente con el link (paso 19).

## Pasarela de pago del cliente (paso 13)

Interfaz `PaymentProvider` en `src/lib/payments`. Hoy existe el proveedor `mock`
(página simulada). Para producción se recomienda **Webpay Plus (Transbank)** o **Flow**:
el cliente ingresa la tarjeta en la página del proveedor, y la app recibe la confirmación
en `/api/pagos/[proveedor]/confirmacion`, que llama a `markRequestPaid`. Así la app queda
fuera del alcance PCI.

## Pendientes conocidos del MVP

- Precios y requisitos del catálogo son referenciales (`prisma/data/catalogo.ts`): validar con el equipo legal.
- Falta el mapeo comuna → CBR / DOM (necesario en fase 2).
- Recuperación de contraseña y verificación de correo.
- Panel interno (backoffice) para editar catálogo, precios y ver solicitudes.
