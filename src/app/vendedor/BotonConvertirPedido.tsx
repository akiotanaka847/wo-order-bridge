"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertirEnPedidoAccion } from "./acciones";

/** Convierte una cotización guardada en pedido, desde el historial. */
export function BotonConvertirPedido({ ordenId }: { ordenId: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function convertir() {
    setError(null);
    iniciar(async () => {
      const r = await convertirEnPedidoAccion(ordenId);
      if (!r.ok) setError(r.mensaje);
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={convertir}
        disabled={pendiente}
        className="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pendiente ? "Generando…" : "Convertir en pedido"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
