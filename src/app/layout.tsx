import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SP · Documentos para tu propiedad",
  description: "Obtén toda la documentación para informes de títulos y saneamiento de propiedades.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
