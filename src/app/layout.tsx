import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "./globals.css";

// Brandbook: Poppins en todas sus variantes (ExtraLight, Regular, Bold…).
const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "SmartProp · Tu carpeta legal",
  description: "Toda la documentación de tu propiedad en un solo lugar: certificados del Conservador, SII, Tesorería y Municipalidad, solicitados en minutos.",
};

export const viewport: Viewport = {
  themeColor: "#003ef3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={poppins.variable}>
      <body className="min-h-dvh">
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
          Saltar al contenido
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
