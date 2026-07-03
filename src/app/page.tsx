import Link from "next/link";
import { NOMBRE_APP, NOMBRE_EMPRESA } from "@/config/app";
import { Logo } from "@/components/Logo";

/**
 * Página de entrada. En la Fase 2 redirige a /login y, según el rol, al panel
 * correspondiente. Por ahora presenta la plataforma y los accesos.
 */
export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-3">
        <Logo className="h-16 w-auto" priority />
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {NOMBRE_EMPRESA}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
          {NOMBRE_APP}
        </h1>
        <p className="text-lg text-slate-600">
          Plataforma interna para vendedores, conectada en tiempo real con World
          Office Cloud. Cotiza, aplica descuentos y genera pedidos listos para
          facturar.
        </p>
      </header>

      <Link
        href="/login"
        className="inline-flex w-fit items-center rounded-lg bg-brand-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-brand-700"
      >
        Iniciar sesión
      </Link>
    </main>
  );
}
