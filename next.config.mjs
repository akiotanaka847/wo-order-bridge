/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    /**
     * Caché del router en el navegador: volver a una vista visitada en los
     * últimos 30 s es instantáneo (sin esperar al servidor). Los datos no se
     * quedan viejos: las mutaciones hacen revalidatePath (purga la caché) y el
     * panel contable además se refresca solo cada 8 s.
     */
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
