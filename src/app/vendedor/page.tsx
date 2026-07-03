import { EncabezadoPagina, Tarjeta } from "@/components/ui";
import { requerirRol } from "@/lib/auth/sesion";
import { obtenerRepositorio } from "@/lib/datos";
import { Cotizador } from "./Cotizador";

/** Panel del vendedor: arma una nueva cotización o pedido. */
export default async function PaginaVendedor() {
  await requerirRol("vendedor");
  const clientes = await obtenerRepositorio().listarClientes();

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Nueva cotización"
        descripcion="Busca por descripción o código, aplica el descuento del cliente y genera el pedido."
      />
      <Tarjeta className="p-5 sm:p-6">
        <Cotizador clientes={clientes} />
      </Tarjeta>
    </div>
  );
}
