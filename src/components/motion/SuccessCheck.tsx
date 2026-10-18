"use client";

import { motion } from "motion/react";

/** Check que se dibuja al confirmar la solicitud. */
export function SuccessCheck() {
  return (
    <motion.svg
      viewBox="0 0 52 52"
      className="h-14 w-14 shrink-0"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      aria-hidden
    >
      <circle cx="26" cy="26" r="25" fill="white" fillOpacity="0.15" />
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <motion.path
        d="M15 27 l7 7 l15 -16"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.45 }}
      />
    </motion.svg>
  );
}
