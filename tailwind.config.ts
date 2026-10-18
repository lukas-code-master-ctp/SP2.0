import type { Config } from "tailwindcss";

// Paleta del Código Visual de Marca SmartProp v1.0.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef3ff",
          100: "#dce6fe",
          200: "#b8cbfd",
          300: "#86a5fb",
          400: "#4a76f8",
          500: "#003ef3", // Azul claro
          600: "#0035d6",
          700: "#002aab",
          800: "#0a1a8a",
          900: "#010072", // Azul oscuro
          sky: "#0490ff",
          violet: "#4436ff",
        },
        mist: "#f2f6f9", // Gris claro
        cloud: "#e2eaf2", // Gris oscuro
        ink: "#0b0b2e",
      },
      backgroundImage: {
        "grad-light": "linear-gradient(90deg, #003ef3, #0490ff)",
        "grad-dark": "linear-gradient(90deg, #4436ff, #010072)",
        "grad-hero": "linear-gradient(135deg, #010072 0%, #1a12b8 45%, #003ef3 100%)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(1,0,114,0.04), 0 4px 16px -4px rgba(1,0,114,0.08)",
        lift: "0 2px 4px rgba(1,0,114,0.06), 0 16px 40px -12px rgba(0,62,243,0.25)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
