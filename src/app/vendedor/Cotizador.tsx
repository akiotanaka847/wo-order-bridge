"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BuscadorProductos } from "@/components/BuscadorProductos";
import { ResumenTotales } from "@/components/ResumenTotales";
import { calcularTotales } from "@/domain/calculos";
import type { Cliente, Producto } from "@/domain/tipos";
import { formatearPesos } from "@/lib/formato";
import { crearOrdenAccion, editarOrdenAccion } from "./acciones";

/** Línea del carrito en construcción (estado local del vendedor). */
export interface LineaCarrito {
  producto: Producto;
  cantidad: number;
  descuentoPct: number;
}

/** Datos de la cotización a editar (modo edición del cotizador). */
export interface EdicionCotizacion {
  ordenId: string;
  clienteId: string;
  lineas: LineaCarrito[];
}

export function Cotizador({
  clientes,
  edicion,
}: {
  clientes: Cliente[];
  edicion?: EdicionCotizacion;
}) {
  const router = useRouter();
  const [clienteId, setClienteId] = useState(edicion?.clienteId ?? "");
  const [carrito, setCarrito] = useState<LineaCarrito[]>(
    edicion?.lineas ?? [],
  );
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const descuentoCliente = cliente?.descuentoPct ?? 0;

  // Totales en vivo: misma fórmula que usa el backend (domain/calculos).
  const totales = useMemo(
    () =>
      calcularTotales(
        carrito.map((l) => ({
          precioUnitario: l.producto.precio,
          cantidad: l.cantidad,
          descuentoPct: l.descuentoPct,
          ivaPct: l.producto.ivaPct,
        })),
      ),
    [carrito],
  );

  function agregar(producto: Producto) {
    setCarrito((actual) => {
      const existente = actual.find((l) => l.producto.id === producto.id);
      if (existente) {
        return actual.map((l) =>
          l.producto.id === producto.id
            ? { ...l, cantidad: l.cantidad + 1 }
            : l,
        );
      }
      return [...actual, { producto, cantidad: 1, descuentoPct: descuentoCliente }];
    });
  }

  function actualizarLinea(productoId: string, cambios: Partial<LineaCarrito>) {
    setCarrito((actual) =>
      actual.map((l) =>
        l.producto.id === productoId ? { ...l, ...cambios } : l,
      ),
    );
  }

  function quitar(productoId: string) {
    setCarrito((actual) => actual.filter((l) => l.producto.id !== productoId));
  }

  /** Al cambiar de cliente, reaplica su descuento a todas las líneas. */
  function cambiarCliente(id: string) {
    setClienteId(id);
    const nuevoDescuento = clientes.find((c) => c.id === id)?.descuentoPct ?? 0;
    setCarrito((actual) =>
      actual.map((l) => ({ ...l, descuentoPct: nuevoDescuento })),
    );
  }

  async function guardar(estado: "cotizacion" | "pedido") {
    setEnviando(true);
    setAviso(null);
    const datos = {
      clienteId,
      estado,
      lineas: carrito.map((l) => ({
        productoId: l.producto.id,
        cantidad: l.cantidad,
        descuentoPct: l.descuentoPct,
      })),
    };
    const resultado = edicion
      ? await editarOrdenAccion(edicion.ordenId, datos)
      : await crearOrdenAccion(datos);
    setEnviando(false);
    setAviso({ texto: resultado.mensaje, ok: resultado.ok });
    if (resultado.ok) {
      if (edicion) {
        // Tras editar, vuelve al historial (la orden ya no está "en curso").
        router.push("/vendedor/historial");
        router.refresh();
      } else {
        setCarrito([]);
        setClienteId("");
        router.refresh(); // actualiza el historial
      }
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Columna izquierda: buscador */}
      <section className="space-y-3" data-guia="buscador-productos">
        <h2 className="text-sm font-semibold text-slate-700">1. Buscar productos</h2>
        <BuscadorProductos onAgregar={agregar} />
      </section>

      {/* Columna derecha: cotización */}
      <section className="space-y-4" data-guia="area-cotizacion">
        <h2 className="text-sm font-semibold text-slate-700">2. Cotización</h2>

        <div className="space-y-1" data-guia="selector-cliente">
          <label className="text-sm font-medium text-slate-700">Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => cambiarCliente(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Selecciona un cliente…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — descuento {c.descuentoPct}%
              </option>
            ))}
          </select>
        </div>

        {carrito.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">
            Agrega productos desde el buscador.
          </p>
        ) : (
          <ul className="space-y-2">
            {carrito.map((l) => (
              <li
                key={l.producto.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {l.producto.descripcion}
                    </p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{l.producto.codigo}</span> ·{" "}
                      {formatearPesos(l.producto.precio)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(l.producto.id)}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Quitar
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1">
                    Cant.
                    <input
                      type="number"
                      min={1}
                      max={l.producto.stock}
                      value={l.cantidad}
                      onChange={(e) =>
                        actualizarLinea(l.producto.id, {
                          cantidad: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="w-16 rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Desc. %
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={l.descuentoPct}
                      onChange={(e) =>
                        actualizarLinea(l.producto.id, {
                          descuentoPct: Math.min(100, Math.max(0, Number(e.target.value))),
                        })
                      }
                      className="w-16 rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}

        {carrito.length > 0 && (
          <div className="rounded-lg bg-slate-50 p-4">
            <ResumenTotales totales={totales} />
          </div>
        )}

        {aviso && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              aviso.ok
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {aviso.texto}
          </p>
        )}

        <div className="flex gap-3" data-guia="acciones-cotizacion">
          <button
            type="button"
            disabled={enviando || carrito.length === 0 || !clienteId}
            onClick={() => guardar("cotizacion")}
            className="flex-1 rounded-lg border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-40"
          >
            {edicion ? "Guardar cambios" : "Guardar cotización"}
          </button>
          <button
            type="button"
            disabled={enviando || carrito.length === 0 || !clienteId}
            onClick={() => guardar("pedido")}
            className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-40"
          >
            Generar pedido
          </button>
        </div>
      </section>
    </div>
  );
}
