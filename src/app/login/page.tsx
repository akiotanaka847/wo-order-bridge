import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NOMBRE_APP, NOMBRE_EMPRESA } from "@/config/app";
import { Logo } from "@/components/Logo";
import { obtenerUsuarioActual } from "@/lib/auth/sesion";
import { esModoSupabase } from "@/lib/datos";
import { RUTA_PANEL } from "@/lib/roles";
import { FormularioLogin } from "./FormularioLogin";

export const metadata: Metadata = { title: `Iniciar sesión · ${NOMBRE_APP}` };

/** Pantalla de inicio de sesión: panel de marca a la izquierda, formulario a la derecha. */
export default async function PaginaLogin() {
  const usuario = await obtenerUsuarioActual();
  if (usuario) redirect(RUTA_PANEL[usuario.rol]);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Izquierda: marca sobre fondo oscuro (estilo split) */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg:flex">
        {/* Acento de marca de fondo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl"
        />

        <span aria-hidden="true" />

        <div className="relative max-w-md space-y-4">
          <Logo className="mb-2 h-14 w-auto" priority />
          <h2 className="text-3xl font-bold leading-tight">
            Cotizaciones y pedidos, conectados con World Office.
          </h2>
          <p className="text-slate-300">
            Cotiza, aplica descuentos y genera pedidos listos para facturar en
            tiempo real. Todo en un solo lugar.
          </p>
          <ul className="space-y-2 pt-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <Punto /> Búsqueda por descripción o código
            </li>
            <li className="flex items-center gap-2">
              <Punto /> Inventario en vivo y descuentos por cliente
            </li>
            <li className="flex items-center gap-2">
              <Punto /> Pedidos que llegan directo a World Office
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} {NOMBRE_EMPRESA}
        </p>
      </section>

      {/* Derecha: formulario */}
      <section className="flex items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-sm space-y-6">
          {/* Marca compacta (visible en móvil, donde se oculta el panel izquierdo) */}
          <header className="flex flex-col items-center space-y-3 text-center lg:items-start lg:text-left">
            <Logo className="h-12 w-auto lg:hidden" priority />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Iniciar sesión
              </h1>
              <p className="text-sm text-slate-500">
                Accede a tu panel según tu rol.
              </p>
            </div>
          </header>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <FormularioLogin />
          </div>

          {/* Solo en modo demo: en Supabase estas cuentas no existen. */}
          {!esModoSupabase() && <CredencialesDemo />}
        </div>
      </section>
    </main>
  );
}

/** Punto de viñeta con color de marca. */
function Punto() {
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />;
}

/** Ayuda visible en modo demo con las credenciales de prueba. */
function CredencialesDemo() {
  const filas = [
    ["Administrador", "admin@demo.com", "admin123"],
    ["Contable", "contable@demo.com", "contable123"],
    ["Vendedor", "vendedor1@demo.com", "vendedor123"],
  ];
  return (
    <details className="rounded-lg bg-white/70 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
      <summary className="cursor-pointer font-medium text-slate-700">
        Credenciales de prueba (demo)
      </summary>
      <table className="mt-2 w-full">
        <tbody>
          {filas.map(([rol, correo, clave]) => (
            <tr key={correo}>
              <td className="py-0.5 pr-2 font-medium">{rol}</td>
              <td className="py-0.5 pr-2">{correo}</td>
              <td className="py-0.5 text-slate-400">{clave}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
