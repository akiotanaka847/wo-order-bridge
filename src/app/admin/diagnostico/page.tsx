import { EncabezadoPagina, Tarjeta } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerClienteWorldOffice } from "@/worldoffice";

/** Ícono de estado según el resultado del chequeo. */
function Estado({ ok }: { ok: boolean | null }) {
  if (ok === true)
    return <span className="text-lg text-emerald-600" aria-label="ok">✓</span>;
  if (ok === false)
    return <span className="text-lg text-red-600" aria-label="falla">✗</span>;
  return <span className="text-lg text-amber-500" aria-label="pendiente">○</span>;
}

/** Diagnóstico de la conexión con World Office (token, IDs y prueba real). */
export default async function PaginaAdminDiagnostico() {
  await requerirRol("administrador");
  const modo = process.env.WORLDOFFICE_MODE ?? "mock";
  const chequeos = await obtenerClienteWorldOffice().diagnosticar();

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Diagnóstico World Office"
        descripcion="Revisa el estado de la conexión con World Office antes de operar en vivo."
      />

      <Tarjeta className="p-5" data-guia="chequeos-wo">
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-slate-600">Modo actual:</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              modo === "live"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {modo === "live" ? "LIVE (cuenta real)" : "MOCK (demo simulado)"}
          </span>
        </div>

        <ul className="divide-y divide-slate-100">
          {chequeos.map((c) => (
            <li key={c.nombre} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 w-5 shrink-0 text-center">
                <Estado ok={c.ok} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{c.nombre}</p>
                <p className="text-sm text-slate-500">{c.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <p className="text-xs text-slate-400">
        ✓ correcto · ✗ requiere atención · ○ pendiente / no aplica. Para pasar a
        producción, configura las variables de World Office y activa
        WORLDOFFICE_MODE=live (ver la guía de integración).
      </p>
    </div>
  );
}
