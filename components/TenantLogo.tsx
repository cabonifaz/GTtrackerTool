// Logos de empresa vienen subidos por el Super Admin en cualquier
// resolucion/proporcion (cuadrados, banners anchos, iconos chicos). Sin un
// contenedor de tamano fijo + object-contain, un logo angosto se ve
// diminuto y uno ancho se estira fuera de su caja -- este componente le da
// el mismo comportamiento consistente en todos lados donde se muestra un
// logo (login, nav, panel de plataforma).
export default function TenantLogo({
  slug,
  alt,
  className,
}: {
  slug: string;
  alt: string;
  className: string;
}) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- logo binario servido desde la DB, no un asset optimizable de next/image */}
      <img src={`/${slug}/logo`} alt={alt} className="max-h-full max-w-full object-contain" />
    </span>
  );
}
