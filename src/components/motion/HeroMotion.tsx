"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { IsoGradients } from "@/components/brand/Logo";
import { ISO_FOLDER, ISO_HOUSE } from "@/components/brand/paths";
import { EASE_OUT } from "./Reveal";

const DOCS = [
  { name: "Dominio vigente", issuer: "Conservador de Bienes Raíces" },
  { name: "Avalúo fiscal", issuer: "SII" },
  { name: "Deuda de contribuciones", issuer: "Tesorería" },
  { name: "Certificado de número", issuer: "Municipalidad" },
];

/**
 * Motion graphic del isotipo: la casa se posa sobre la carpeta y los certificados
 * se obtienen uno a uno y entran a la carpeta. Cuenta la promesa de marca:
 * "toda la documentación en un solo lugar, solicitada en minutos".
 */
export function HeroMotion() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [filed, setFiled] = useState(0);

  useEffect(() => {
    if (reduce) return;
    setReady(false);
    // Al reiniciar el ciclo la carpeta se vacía.
    const t0 = setTimeout(() => index === 0 && setFiled(0), 400);
    const t1 = setTimeout(() => setReady(true), 1300);
    const t2 = setTimeout(() => {
      setFiled(index + 1);
      setIndex((i) => (i + 1) % DOCS.length);
    }, 2400);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [index, reduce]);

  const doc = DOCS[index];
  const count = reduce ? DOCS.length : Math.min(filed, DOCS.length);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden>
      {/* Panel con la grilla de construcción del isotipo */}
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] bg-grad-hero shadow-lift">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <motion.div
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-sky/30 blur-3xl"
          animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Halo para que la casa (azul oscuro) se lea sobre el fondo */}
      <div className="absolute left-1/2 top-[54%] h-[52%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 blur-2xl" />

      {/* Isotipo animado */}
      <svg viewBox="18 160 33 30" className="absolute left-1/2 top-[54%] w-[58%] -translate-x-1/2 -translate-y-1/2 overflow-visible">
        <IsoGradients prefix="hero" />
        <motion.path
          d={ISO_HOUSE}
          fill="url(#hero-house)"
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.15 }}
        />
        <motion.path
          d={ISO_FOLDER}
          fill="url(#hero-folder)"
          style={{ transformOrigin: "24px 186px", transformBox: "view-box" }}
          initial={{ rotate: -14, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.35 }}
        />
      </svg>

      {/* Certificado que se está obteniendo */}
      <div className="absolute inset-x-0 top-[9%] flex justify-center">
        <AnimatePresence mode="wait">
          {!reduce && (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 150, scale: 0.35, transition: { duration: 0.45, ease: [0.55, 0, 0.75, 0.2] } }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
              className="flex w-[78%] items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lift backdrop-blur"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
                <AnimatePresence mode="wait" initial={false}>
                  {ready ? (
                    <motion.span key="ok" className="block" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                      <Check className="h-5 w-5" strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span key="load" className="block" exit={{ scale: 0 }}>
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-brand-900">{doc.name}</span>
                <span className="block truncate text-xs text-slate-500">{doc.issuer}</span>
              </span>
              <span className={ready ? "text-xs font-semibold text-emerald-600" : "text-xs font-medium text-slate-400"}>
                {ready ? "Listo" : "Obteniendo"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contador de la carpeta */}
      <div className="absolute inset-x-[11%] bottom-[8%] rounded-2xl bg-white/10 px-4 py-3 text-white ring-1 ring-white/20 backdrop-blur">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Tu carpeta legal</span>
          <span className="tabular-nums text-white/80">
            {count} de {DOCS.length} documentos
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-brand-sky to-white"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: count / DOCS.length }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
          />
        </div>
      </div>
    </div>
  );
}
