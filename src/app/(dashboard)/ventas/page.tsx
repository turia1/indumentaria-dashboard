import { db } from "@/lib/db"
import { sales, saleItems, products, productVariants, locations } from "@/lib/db/schema"
import { desc, eq, sql } from "drizzle-orm"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  ShoppingBag, TrendingUp, Store, Globe,
  Package, DollarSign, BarChart3
} from "lucide-react"

export default async function VentasPage() {
  const YEAR = 2025

  // Totales generales
  const [totals] = await db
    .select({
      totalVentas:     sql<string>`COALESCE(SUM(s.total::numeric), 0)`,
      totalUnidades:   sql<number>`COALESCE(SUM(si.quantity), 0)::int`,
      ticketPromedio:  sql<string>`COALESCE(AVG(s.total::numeric), 0)`,
      cantTransacc:    sql<number>`COUNT(DISTINCT s.id)::int`,
    })
    .from(sales)
    .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
    .where(sql`EXTRACT(YEAR FROM ${sales.date}) = ${YEAR}`)

  // Ventas por local
  const porLocal = await db
    .select({
      localId:    locations.id,
      localNombre: locations.name,
      total:      sql<string>`COALESCE(SUM(${sales.total}::numeric), 0)`,
      unidades:   sql<number>`COALESCE(SUM(${saleItems.quantity}), 0)::int`,
      transacc:   sql<number>`COUNT(DISTINCT ${sales.id})::int`,
    })
    .from(locations)
    .leftJoin(sales, sql`${sales.locationId} = ${locations.id} AND EXTRACT(YEAR FROM ${sales.date}) = ${YEAR}`)
    .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
    .groupBy(locations.id, locations.name)
    .orderBy(sql`SUM(${sales.total}::numeric) DESC NULLS LAST`)

  // Top 20 productos
  const topProductos = await db
    .select({
      nombre:   products.name,
      sku:      products.sku,
      categoria: products.category,
      unidades: sql<number>`SUM(${saleItems.quantity})::int`,
      total:    sql<string>`SUM(${saleItems.subtotal}::numeric)`,
      precioPromedio: sql<string>`AVG(${saleItems.unitPrice}::numeric)`,
    })
    .from(saleItems)
    .innerJoin(productVariants, eq(productVariants.id, saleItems.productVariantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .where(sql`EXTRACT(YEAR FROM ${sales.date}) = ${YEAR} AND ${products.category} != 'OFERTA'`)
    .groupBy(products.id, products.name, products.sku, products.category)
    .orderBy(sql`SUM(${saleItems.subtotal}::numeric) DESC`)
    .limit(20)

  // Distribución por categoría
  const porCategoria = await db
    .select({
      categoria: products.category,
      unidades:  sql<number>`SUM(${saleItems.quantity})::int`,
      total:     sql<string>`SUM(${saleItems.subtotal}::numeric)`,
    })
    .from(saleItems)
    .innerJoin(productVariants, eq(productVariants.id, saleItems.productVariantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .where(sql`EXTRACT(YEAR FROM ${sales.date}) = ${YEAR}`)
    .groupBy(products.category)
    .orderBy(sql`SUM(${saleItems.subtotal}::numeric) DESC`)

  const totalVentas = Number(totals?.totalVentas ?? 0)
  const fmt = (n: number) => formatCurrency(n)

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Ventas</h1>
        <p className="text-gray-400 text-sm mt-0.5">Análisis anual {YEAR}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Facturación total",  value: fmt(totalVentas),                        icon: DollarSign,  color: "text-emerald-400" },
          { label: "Unidades vendidas",  value: (totals?.totalUnidades ?? 0).toLocaleString("es-AR"), icon: Package,    color: "text-blue-400"    },
          { label: "Ticket promedio",    value: fmt(Number(totals?.ticketPromedio ?? 0)), icon: TrendingUp,  color: "text-yellow-400"  },
          { label: "Transacciones",      value: (totals?.cantTransacc ?? 0).toLocaleString("es-AR"),   icon: BarChart3,  color: "text-purple-400"  },
        ].map(k => (
          <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-sm">{k.label}</p>
              <div className={`p-2 rounded-xl bg-gray-800 ${k.color}`}>
                <k.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Ventas por local */}
      <section>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Por local</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {porLocal.map(l => {
            const monto = Number(l.total)
            const pct   = totalVentas > 0 ? (monto / totalVentas * 100) : 0
            const isOnline = l.localNombre === "Tienda Online"
            return (
              <div key={l.localId} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-gray-400 text-sm truncate">{l.localNombre}</p>
                  {isOnline
                    ? <Globe className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    : <Store className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  }
                </div>
                <p className="text-xl font-bold text-white">{fmt(monto)}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{l.unidades.toLocaleString("es-AR")} unid</span>
                    {pct > 0 && <span className="text-indigo-400 font-medium">{pct.toFixed(1)}%</span>}
                  </div>
                  {totalVentas > 0 && (
                    <div className="w-full bg-gray-800 rounded-full h-1">
                      <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Top productos + Categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Top 20 productos */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h2 className="text-white font-semibold">Top 20 productos</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {topProductos.map((p, i) => {
              const monto = Number(p.total)
              const pct   = totalVentas > 0 ? (monto / totalVentas * 100) : 0
              return (
                <div key={`${p.sku}-${i}`} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-800/40 transition-colors">
                  <span className="text-gray-600 text-xs w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-gray-200 text-sm truncate">{p.nombre}</p>
                      <p className="text-white text-sm font-semibold flex-shrink-0">{fmt(monto)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-1">
                        <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${Math.min(pct * 8, 100)}%` }} />
                      </div>
                      <span className="text-gray-500 text-xs w-14 text-right">{p.unidades}u · {pct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Por categoría */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-yellow-400" />
            <h2 className="text-white font-semibold">Por categoría</h2>
          </div>
          <div className="space-y-3">
            {porCategoria.map(c => {
              const monto = Number(c.total)
              const pct   = totalVentas > 0 ? (monto / totalVentas * 100) : 0
              const isOferta = c.categoria === "OFERTA"
              return (
                <div key={c.categoria ?? "sin-cat"}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs ${isOferta ? "text-orange-400" : "text-gray-300"}`}>
                      {c.categoria ?? "Sin categoría"}
                    </span>
                    <span className="text-gray-400 text-xs">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${isOferta ? "bg-orange-500" : "bg-indigo-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-white text-xs w-20 text-right font-medium">{fmt(monto)}</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">{c.unidades.toLocaleString("es-AR")} unidades</p>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
