import { db } from "@/lib/db"
import { products, productVariants, saleItems, sales } from "@/lib/db/schema"
import { eq, sql, desc } from "drizzle-orm"
import { formatCurrency } from "@/lib/utils"
import { Package, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react"

export default async function StockPage() {
  const YEAR = 2025

  // Productos con sus ventas anuales (ranking de rotación)
  const rotacion = await db
    .select({
      productoId:  products.id,
      nombre:      products.name,
      sku:         products.sku,
      categoria:   products.category,
      color:       productVariants.color,
      talle:       productVariants.size,
      stockActual: productVariants.currentStock,
      stockMinimo: productVariants.minStockAlert,
      unidadesVendidas: sql<number>`COALESCE(SUM(${saleItems.quantity}), 0)::int`,
      montoVendido:     sql<string>`COALESCE(SUM(${saleItems.subtotal}::numeric), 0)`,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(saleItems, eq(saleItems.productVariantId, productVariants.id))
    .leftJoin(sales, sql`${sales.id} = ${saleItems.saleId} AND EXTRACT(YEAR FROM ${sales.date}) = ${YEAR}`)
    .where(sql`${products.active} = true AND ${products.category} != 'OFERTA'`)
    .groupBy(products.id, products.name, products.sku, products.category, productVariants.id, productVariants.color, productVariants.size, productVariants.currentStock, productVariants.minStockAlert)
    .orderBy(desc(sql`COALESCE(SUM(${saleItems.quantity}), 0)`))
    .limit(100)

  // Alertas de stock crítico (stock <= mínimo)
  const alertas = rotacion.filter(r => r.stockActual <= r.stockMinimo)

  // Productos sin movimiento (0 unidades vendidas en el año)
  const sinMovimiento = rotacion.filter(r => r.unidadesVendidas === 0)

  // KPIs
  const totalVariantes = rotacion.length
  const conAlerta      = alertas.length
  const conMovimiento  = rotacion.filter(r => r.unidadesVendidas > 0).length

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Stock</h1>
        <p className="text-gray-400 text-sm mt-0.5">Inventario y rotación {YEAR}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-sm">Variantes activas</p>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalVariantes.toLocaleString("es-AR")}</p>
          <p className="text-gray-500 text-xs mt-1">combinaciones color/talle</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-sm">Alertas de stock</p>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{conAlerta}</p>
          <p className="text-gray-500 text-xs mt-1">en o por debajo del mínimo</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-sm">Con rotación</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{conMovimiento}</p>
          <p className="text-gray-500 text-xs mt-1">variantes vendidas en {YEAR}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-sm">Sin rotación</p>
            <BarChart3 className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400">{sinMovimiento.length}</p>
          <p className="text-gray-500 text-xs mt-1">sin ventas en el año</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Alertas de stock */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-white font-semibold">Stock crítico</h2>
            {conAlerta > 0 && (
              <span className="ml-auto bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                {conAlerta} alertas
              </span>
            )}
          </div>
          {conAlerta === 0 ? (
            <div className="p-8 text-center">
              <Package className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="text-emerald-400 font-medium">Stock OK</p>
              <p className="text-gray-600 text-sm mt-1">No hay alertas de stock crítico</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
              {alertas.slice(0, 30).map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-gray-200 text-sm truncate">{a.nombre}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {[a.color, a.talle].filter(Boolean).join(" · ") || "Sin variante"}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-red-400 font-bold">{a.stockActual}</p>
                    <p className="text-gray-600 text-xs">mín: {a.stockMinimo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top rotación */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h2 className="text-white font-semibold">Mayor rotación {YEAR}</h2>
          </div>
          <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
            {rotacion.filter(r => r.unidadesVendidas > 0).slice(0, 25).map((r, i) => {
              const maxU = rotacion[0]?.unidadesVendidas || 1
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 text-sm truncate">{r.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-800 rounded-full h-1">
                        <div
                          className="bg-indigo-500 h-1 rounded-full"
                          style={{ width: `${(r.unidadesVendidas / maxU) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-500 text-xs flex-shrink-0">{r.unidadesVendidas}u</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs w-20 text-right flex-shrink-0">
                    {formatCurrency(Number(r.montoVendido))}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Productos sin movimiento */}
      {sinMovimiento.length > 0 && (
        <div className="bg-gray-900 border border-yellow-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-yellow-400" />
            <h2 className="text-white font-semibold">Sin movimiento en {YEAR}</h2>
            <span className="ml-auto text-yellow-400 text-xs bg-yellow-500/10 px-2 py-0.5 rounded-full">
              {sinMovimiento.length} variantes
            </span>
          </div>
          <div className="p-5">
            <p className="text-gray-400 text-sm mb-3">
              Estas variantes no registraron ventas en {YEAR}. Revisá si son stock muerto o artículos discontinuados.
            </p>
            <div className="flex flex-wrap gap-2">
              {[...new Set(sinMovimiento.map(r => r.nombre))].slice(0, 30).map((nombre, i) => (
                <span key={i} className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full border border-gray-700">
                  {nombre}
                </span>
              ))}
              {new Set(sinMovimiento.map(r => r.nombre)).size > 30 && (
                <span className="text-gray-600 text-xs px-3 py-1">
                  +{new Set(sinMovimiento.map(r => r.nombre)).size - 30} más
                </span>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
