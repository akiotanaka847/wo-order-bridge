import Link from "next/link";
import { EncabezadoPagina, Tarjeta } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { FormularioCliente } from "../../FormularioCliente";

/** Alta de un cliente (tercero) nuevo. */
export default async function PaginaNuevoCliente() {
  await requerirRol("administrador");

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Nuevo cliente"
        descripcion="Crea un tercero con los datos de World Office."
        acciones={
          <Link
            href="/admin/clientes"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-700"
          >
            ← Volver a clientes
          </Link>
        }
      />
      <Tarjeta className="p-5">
        <FormularioCliente />
      </Tarjeta>
    </div>
  );
}
