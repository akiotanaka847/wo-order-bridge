import { redirect } from "next/navigation";
import { EncabezadoPagina, Tarjeta } from "@/components/ui";
import type { LineaOrden, Producto } from "@/domain/tipos";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { Cotizador, type LineaCarrito } from "../../Cotizador";

/**
 * Reconstruye un Producto a partir del snapshot de la línea, para el caso en que
 * el producto ya no exista en el catálogo. Conserva el código contable.
 */
function productoDesdeLinea(l: LineaOrden): Producto {
  return {
    id: l.productoId,
    codigo: l.codigo,
    descripcion: l.descripcion,
    categoria: "sellos_mecanicos",
    marca: "",
    unidad: "UND",
    precio: l.precioUnitario,
    ivaPct: l.ivaPct,
    stock: l.cantidad,
    activo: true,
  };
}

/** Edición de una cotización: reutiliza el Cotizador precargado. */
export default async function PaginaEditarCotizacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const vendedor = await requerirRol("vendedor");
  const { id } = await params;

  const repo = obtenerRepositorio();
  const [orden, clientes] = await Promise.all([
    repo.obtenerOrden(id),
    repo.listarClientes(),
  ]);

  // Solo el dueño puede editar, y solo mientras sea cotización.
  if (!orden || orden.vendedorId !== vendedor.id || orden.estado !== "cotizacion") {
    redirect("/vendedor/historial");
  }

  // Reconstruye el carrito con el producto real (o el snapshot si ya no existe).
  const lineas: LineaCarrito[] = await Promise.all(
    orden.lineas.map(async (l) => ({
      producto: (await repo.obtenerProducto(l.productoId)) ?? productoDesdeLinea(l),
      cantidad: l.cantidad,
      descuentoPct: l.descuentoPct,
    })),
  );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo={`Editar ${orden.consecutivo}`}
        descripcion="Ajusta el cliente, los productos o las cantidades. Guarda los cambios o genera el pedido."
      />
      <Tarjeta className="p-5 sm:p-6">
        <Cotizador
          clientes={clientes}
          edicion={{ ordenId: orden.id, clienteId: orden.clienteId, lineas }}
        />
      </Tarjeta>
    </div>
  );
}
