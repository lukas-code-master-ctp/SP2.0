import { ISO_FOLDER, ISO_HOUSE, WORDMARK_PATHS } from "./paths";

/** Degradados del isotipo (brandbook: gradiente oscuro para la casa, claro para la carpeta). */
export function IsoGradients({ prefix = "sp" }: { prefix?: string }) {
  return (
    <defs>
      <linearGradient id={`${prefix}-house`} gradientUnits="userSpaceOnUse" x1="24" y1="165" x2="40" y2="182">
        <stop offset="0" stopColor="#4436ff" />
        <stop offset="0.45" stopColor="#1812a2" />
        <stop offset="1" stopColor="#010072" />
      </linearGradient>
      <linearGradient id={`${prefix}-folder`} gradientUnits="userSpaceOnUse" x1="33" y1="187" x2="38" y2="172">
        <stop offset="0" stopColor="#003ef3" />
        <stop offset="1" stopColor="#0490ff" />
      </linearGradient>
    </defs>
  );
}

type LogoProps = {
  /** "full" = imagotipo horizontal; "iso" = solo isotipo. */
  variant?: "full" | "iso";
  /** Color del logotipo: negro sobre fondos claros, blanco sobre fondos oscuros. */
  tone?: "dark" | "light";
  className?: string;
  title?: string;
};

export function Logo({ variant = "full", tone = "dark", className, title = "SmartProp" }: LogoProps) {
  const viewBox = variant === "full" ? "21.5 164.5 119.5 25" : "22 164.5 25 22.5";
  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <IsoGradients />
      <path d={ISO_HOUSE} fill="url(#sp-house)" />
      <path d={ISO_FOLDER} fill="url(#sp-folder)" />
      {variant === "full" && (
        <g fill={tone === "dark" ? "#000000" : "#ffffff"}>
          {WORDMARK_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}
    </svg>
  );
}
