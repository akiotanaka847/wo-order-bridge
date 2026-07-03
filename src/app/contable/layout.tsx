import { PanelShell, type ItemNav } from "@/components/PanelShell";
import { IconoHistorial, IconoOrdenes } from "@/components/Iconos";
import { requerirRol } from "@/lib/auth/sesion";

const NAV: ItemNav[] = [
  { href: "/contable", label: "Pedidos", icono: <IconoOrdenes /> },
  { href: "/contable/facturados", label: "Facturados", icono: <IconoHistorial /> },
];

export default async function LayoutContable({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requerirRol("contable");
  return (
    <PanelShell usuario={usuario} items={NAV}>
      {children}
    </PanelShell>
  );
}
