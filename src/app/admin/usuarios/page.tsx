import { Paginador } from "@/components/Paginador";
import { EncabezadoPagina, Tarjeta } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { leerPagina, paginar } from "@/lib/paginacion";
import { ETIQUETA_ROL } from "@/lib/roles";
import { BotonEliminarUsuario } from "../BotonEliminarUsuario";
import { FormularioUsuario } from "../FormularioUsuario";

/** Gestión de usuarios: crear vendedores/contables y eliminarlos. */
export default async function PaginaAdminUsuarios({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requerirRol("administrador");
  const { page } = await searchParams;
  const usuarios = await obtenerRepositorio().listarUsuarios();
  // El administrador gestiona a los demás, no a sí mismo.
  const gestionables = usuarios.filter((u) => u.id !== admin.id);
  const pagina = paginar(gestionables, leerPagina(page));

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Crea y elimina vendedores y contables. El acceso se da y se quita aquí."
      />

      <Tarjeta className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          Crear usuario
        </h2>
        <FormularioUsuario />
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gestionables.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Aún no has creado usuarios.
                  </td>
                </tr>
              ) : (
                pagina.items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {u.nombre}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {ETIQUETA_ROL[u.rol]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BotonEliminarUsuario id={u.id} nombre={u.nombre} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      <Paginador
        pagina={pagina.pagina}
        totalPaginas={pagina.totalPaginas}
        total={pagina.total}
      />
    </div>
  );
}
