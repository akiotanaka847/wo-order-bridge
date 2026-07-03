"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { accionCerrarSesion } from "@/app/acciones-sesion";
import type { Usuario } from "@/domain/tipos";
import { ETIQUETA_ROL } from "@/lib/roles";
import { IconoCerrar, IconoMenu, IconoSalir } from "@/components/Iconos";
import { Logo } from "@/components/Logo";

/** Un enlace del menú lateral. */
export interface ItemNav {
  href: Route;
  label: string;
  icono: ReactNode;
}

interface Props {
  usuario: Usuario;
  items: ItemNav[];
  children: ReactNode;
}

/**
 * Estructura común de los tres paneles: menú lateral (fijo en escritorio,
 * cajón deslizante en móvil), cabecera móvil con botón de menú y área de
 * contenido. La navegación marca el enlace activo según la ruta.
 */
export function PanelShell({ usuario, items, children }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Menú lateral fijo (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Sidebar usuario={usuario} items={items} />
      </aside>

      {/* Cajón lateral (móvil) */}
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setAbierto(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col border-r border-slate-200 bg-white shadow-xl">
            <Sidebar
              usuario={usuario}
              items={items}
              onNavegar={() => setAbierto(false)}
            />
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="lg:pl-64">
        {/* Cabecera móvil */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            <IconoMenu />
          </button>
          <Logo className="h-7 w-auto" priority />
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Contenido interno del menú lateral (compartido entre escritorio y móvil). */
function Sidebar({
  usuario,
  items,
  onNavegar,
}: {
  usuario: Usuario;
  items: ItemNav[];
  onNavegar?: () => void;
}) {
  const pathname = usePathname();

  // Activo = el item cuyo href es el prefijo MÁS LARGO de la ruta actual. Así
  // "/admin" (Resumen) no queda marcado cuando estás en "/admin/usuarios".
  const hrefActivo = items
    .filter(
      (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
    )
    .reduce<string | null>(
      (mejor, i) => (mejor && mejor.length >= i.href.length ? mejor : i.href),
      null,
    );

  return (
    <>
      {/* Marca */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <Logo className="h-9 w-auto" priority />
          <span className="mt-2 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">
            {ETIQUETA_ROL[usuario.rol]}
          </span>
        </div>
        {onNavegar && (
          <button
            type="button"
            onClick={onNavegar}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Cerrar menú"
          >
            <IconoCerrar />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const activo = item.href === hrefActivo;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavegar}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                activo
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <span className={activo ? "text-brand-700" : "text-slate-400"}>
                {item.icono}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Usuario + salir */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
            {usuario.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">
              {usuario.nombre}
            </p>
            <p className="truncate text-xs text-slate-400">{usuario.email}</p>
          </div>
        </div>
        <form action={accionCerrarSesion}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <IconoSalir className="h-5 w-5" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}
