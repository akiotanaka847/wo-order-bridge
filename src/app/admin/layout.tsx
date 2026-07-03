import { PanelShell, type ItemNav } from "@/components/PanelShell";
import {
  IconoCarrito,
  IconoDiagnostico,
  IconoInventario,
  IconoOrdenes,
  IconoResumen,
  IconoUsuarios,
} from "@/components/Iconos";
import { requerirRol } from "@/lib/auth/sesion";

const NAV: ItemNav[] = [
  { href: "/admin", label: "Resumen", icono: <IconoResumen /> },
  { href: "/admin/usuarios", label: "Usuarios", icono: <IconoUsuarios /> },
  { href: "/admin/clientes", label: "Clientes", icono: <IconoCarrito /> },
  { href: "/admin/inventario", label: "Inventario", icono: <IconoInventario /> },
  { href: "/admin/ordenes", label: "Órdenes", icono: <IconoOrdenes /> },
  { href: "/admin/diagnostico", label: "Diagnóstico WO", icono: <IconoDiagnostico /> },
];

export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requerirRol("administrador");
  return (
    <PanelShell usuario={usuario} items={NAV}>
      {children}
    </PanelShell>
  );
}
