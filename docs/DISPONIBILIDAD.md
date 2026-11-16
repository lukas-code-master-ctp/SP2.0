# Disponibilidad de documentos por comuna

La app bloquea (no se pueden marcar ni pagar) los documentos que no se pueden obtener por internet en la comuna de la
propiedad. La regla vive en `src/lib/disponibilidad/` y se revisó el 2026-11-16.

Estados:

- **DISPONIBLE**: hay un canal en línea comprobado.
- **NO_DISPONIBLE**: el emisor no tiene canal digital (sin sitio web, sitio caído o solo informativo).
- **POR_CONFIRMAR**: no pudimos comprobar un canal en línea (por ejemplo, el conservador atiende solo por correo).
  Mientras `BLOQUEAR_POR_CONFIRMAR` sea `true`, también se bloquean.

`npx tsx scripts/matriz-disponibilidad.ts > matriz.csv` exporta la matriz completa (16 documentos × 346 comunas).

## Reglas por documento

| Documento | Regla | Fuente |
| --- | --- | --- |
| Avalúo fiscal (SII), deuda de contribuciones (TGR), matrimonio y posesión efectiva (Registro Civil) | Disponible en todo Chile | Conectores que ya funcionan |
| No expropiación SERVIU | Disponible en 345 comunas; no en Antártica | Lista de comunas del formulario de cne.minvu.cl |
| Dominio vigente, GP, títulos anteriores, plano, reglamento de copropiedad | Según el conservador de la comuna (`conservadores.ts`) | Directorio de juzgado.cl + revisión del sitio de cada conservador que no aparecía "en línea" |
| Número, CIP, no expropiación municipal | Disponible si la DOM usa SmartDOM, DOM Digital o FiLeDOM; CIP también en portales propios de la RM | Prueba de las direcciones de las 3 plataformas para las 346 comunas; directorio de Grupo Colibrí (junio 2026) |
| Recepción final | Por confirmar en todas | La copia se pide al archivo de la DOM; no encontramos trámite en línea |
| Deuda de aseo | Disponible solo en Las Condes | Conector probado; en el resto falta revisar cada municipalidad |
| Escritura de la última transferencia | Por confirmar en todas | Depende de la notaría o archivero, no de la comuna |

Cuando una comuna tiene dos conservadores (oficio nuevo que se separó de uno antiguo), cuenta el peor de los dos,
porque las inscripciones antiguas siguen en el oficio anterior.

## Cómo desbloquear algo

Al confirmar un canal en línea, cambiar el estado del conservador en `conservadores.ts`, agregar la comuna a
`municipal.ts` o ajustar la regla en `index.ts`. Los tests de `disponibilidad.test.ts` comprueban que los datos solo
nombren comunas del catálogo.
