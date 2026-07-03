import Link from "next/link";
import { EncabezadoPagina, Tarjeta } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { FormularioProducto } from "../../FormularioProducto";

/** Alta de un producto (inventario) nuevo. */
export default async function PaginaNuevoProducto() {
  await requerirRol("administrador");

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Nuevo producto"
        descripcion="Crea un ítem de inventario con los datos de World Office."
        acciones={
          <Link
            href="/admin/inventario"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-700"
          >
            ← Volver al inventario
          </Link>
        }
      />
      <Tarjeta className="p-5">
        <FormularioProducto />
      </Tarjeta>
    </div>
  );
}
