"use client";

import { motion, type HTMLMotionProps } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Aparece subiendo levemente cuando entra en pantalla. */
export function Reveal({ delay = 0, y = 14, ...props }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay }}
      {...props}
    />
  );
}

/** Contenedor que escalona la entrada de sus StaggerItem. */
export function Stagger({ gap = 0.06, as = "div", ...props }: HTMLMotionProps<"div"> & { gap?: number; as?: "div" | "ul" | "ol" }) {
  const Comp = as === "ul" ? motion.ul : as === "ol" ? motion.ol : motion.div;
  return (
    <Comp
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      {...(props as object)}
    />
  );
}

export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

export function StaggerItem({ as = "div", ...props }: HTMLMotionProps<"div"> & { as?: "div" | "li" }) {
  const Comp = as === "li" ? motion.li : motion.div;
  return <Comp variants={itemVariants} {...(props as object)} />;
}

/** Transición de entrada de página. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>
      {children}
    </motion.div>
  );
}
