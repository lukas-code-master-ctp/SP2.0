# Disponibilidad de documentos por comuna

La app bloquea (no se pueden marcar ni pagar) los documentos que no se pueden obtener a distancia en la comuna de la
propiedad. La regla vive en `src/lib/disponibilidad/` y se revisó el 2026-11-22.

Hay dos estados:

- **DISPONIBLE**: el emisor recibe el pedido a distancia, sea en línea o por correo. Si es por correo, el motor deja el
  documento en "requiere acción" y lo gestiona una persona.
- **NO_DISPONIBLE**: no encontramos una forma de pedirlo sin ir en persona.

`npx tsx scripts/matriz-disponibilidad.ts > matriz.csv` exporta la matriz completa (16 documentos × 346 comunas).

## Reglas por documento

| Documento | Regla | Fuente |
| --- | --- | --- |
| Avalúo fiscal (SII), deuda de contribuciones (TGR), matrimonio y posesión efectiva (Registro Civil) | Disponible en todo Chile | Conectores que ya funcionan |
| Escritura de la última transferencia | Disponible en todo Chile | Ley 21.772: las notarías entregan copias a distancia; las antiguas, el archivero judicial |
| No expropiación SERVIU | Disponible en 345 comunas; no en Antártica | Lista de comunas del formulario de cne.minvu.cl |
| Dominio vigente, GP, títulos anteriores, plano, reglamento de copropiedad | Según el conservador de la comuna (`conservadores.ts`): disponible si tiene formulario en línea o correo publicado | Directorio de juzgado.cl + revisión del sitio de cada conservador |
| Número, CIP, no expropiación municipal, recepción final | Disponible si la DOM tiene plataforma en línea (SmartDOM, DOM Digital, FiLeDOM, DOM en Línea), trámite de obras en línea en el sitio municipal o correo de la DOM publicado (`municipal.ts`) | Prueba de las plataformas para las 346 comunas, revisión del sitio de cada municipalidad, directorio de Grupo Colibrí |
| Deuda de aseo | Disponible si el sitio de la municipalidad tiene pago o consulta de aseo en línea | Revisión del sitio de cada municipalidad |

Cuando una comuna tiene dos conservadores (oficio nuevo que se separó de uno antiguo), deben servir los dos, porque
las inscripciones antiguas siguen en el oficio anterior.

Límite conocido: unas 100 municipalidades bloquean las visitas desde servidores (Cloudflare) o no tienen un sitio que
encontráramos. Para esas comunas solo cuenta la prueba de plataformas DOM, así que pueden quedar bloqueadas de más.
Conviene revisarlas desde un navegador normal.

## Cómo desbloquear algo

Al confirmar un canal, cambiar el estado del conservador en `conservadores.ts` o agregar la comuna y el documento a
`municipal.ts`. Los tests de `disponibilidad.test.ts` comprueban que los datos solo nombren comunas del catálogo.
