import { PanelShell, type ItemNav } from "@/components/PanelShell";
import {
  IconoCarrito,
  IconoHistorial,
  IconoInventario,
} from "@/components/Iconos";
import { requerirRol } from "@/lib/auth/sesion";

const NAV: ItemNav[] = [
  { href: "/vendedor", label: "Nueva cotización", icono: <IconoCarrito /> },
  { href: "/vendedor/historial", label: "Mi historial", icono: <IconoHistorial /> },
  { href: "/vendedor/inventario", label: "Inventario", icono: <IconoInventario /> },
];

export default async function LayoutVendedor({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requerirRol("vendedor");
  return (
    <PanelShell usuario={usuario} items={NAV}>
      {children}
    </PanelShell>
  );
}
