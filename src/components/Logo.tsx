import Image from "next/image";
import { NOMBRE_EMPRESA } from "@/config/app";

/**
 * Logo de la empresa. El archivo vive en `public/marca/logo.png`: cambiar la
 * marca del cliente = reemplazar ese archivo (y los colores en globals.css),
 * sin tocar el código. El texto alternativo usa el nombre desde la config.
 */
export function Logo({
  className = "h-9 w-auto",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/marca/logo.png"
      alt={NOMBRE_EMPRESA}
      width={192}
      height={84}
      priority={priority}
      className={className}
    />
  );
}
