import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Los conectores con navegador corren en el motor (worker), no en Vercel: no empaquetarlos.
  serverExternalPackages: ["playwright", "playwright-core"],
};

export default nextConfig;
