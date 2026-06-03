import { auth } from "@/lib/auth"
import { KpiCard } from "@/components/dashboard/kpi-card"
import {
  getAnualSummary,
  getSalesByLocation,
  getTopProducts,
  getTopColors,
  getSizeDistribution,
} from "@/lib/queries/dashboard"
import {
  ShoppingBag, DollarSign, TrendingUp, Users,
  Package, Store, Globe, BarChart3,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

// Componente tarjeta de local
function LocationCard({
  name, sales, units, pct, isOnline = false
}: {
  name: string; sales: number; units: number; pct: number; isOnline?: boolean
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <p className="text-gray-400 text-sm font-medium">{name}</p>
        <div className={`p-2 rounded-xl bg-gray-800 ${isOnline ? "text-purple-400" : "text-blue-400"}`}>
          {isOnline ? <Globe className="w-4 h-4" /> : <Store className="w-4 h-4" />}
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{formatCurrency(sales)}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{units.toLocaleString("es-AR")} unidades</span>
        {pct > 0 && (
          <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
            {pct.toFixed(1)}% del total
          </span>
        )}
      </div>
    </div>
  )
}

const CURRENT_YEAR = 2025

export default async function DashboardPage() {
  const session = await auth()

  // Cargar todos los datos en paralelo
  const [summary, byLocation, topProducts, topColors, sizes] = await Promise.all([
    getAnualSummary(CURRENT_YEAR),
    getSalesByLocation(CURRENT_YEAR),
    getTopProducts(CURRENT_YEAR, 10),
    getTopColors(CURRENT_YEAR, 6),
    getSizeDistribution(CURRENT_YEAR),
  ])

  const totalSales  = Number(summary.total_sales)
  const avgTicket   = Number(summary.avg_ticket)
  const totalUnits  = summary.total_units

  // Mapear locales
  const locationById = Object.fromEntries(byLocation.map(l => [l.id, l]))
  const quilmes  = locationById["loc_1"]
  const chascomus = locationById["loc_2"]
  const mdp      = locationById["loc_3"]
  const online   = locationById["loc_online"]

  return (
    <div className="p-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Bienvenido, {session?.user?.name?.split(" ")[0]} 👋 · Datos anuales {CURRENT_YEAR}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-gray-400 text-sm">Datos cargados</span>
        </div>
      </div>

      {/* KPIs principales */}
      <section>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Resumen anual {CURRENT_YEAR}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Facturación total"
            value={formatCurrency(totalSales)}
            icon={ShoppingBag}
            iconColor="text-indigo-400"
          />
          <KpiCard
            title="Unidades vendidas"
            value={totalUnits.toLocaleString("es-AR")}
            icon={Package}
            iconColor="text-emerald-400"
          />
          <KpiCard
            title="Ticket promedio"
            value={formatCurrency(avgTicket)}
            icon={DollarSign}
            iconColor="text-yellow-400"
          />
          <KpiCard
            title="Artículos distintos"
            value={topProducts.length > 0 ? "997+" : "—"}
            icon={BarChart3}
            iconColor="text-pink-400"
          />
        </div>
      </section>

      {/* Ventas por local */}
      <section>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Ventas por local — {CURRENT_YEAR}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LocationCard
            name="Showroom Quilmes"
            sales={Number(quilmes?.total_sales ?? 0)}
            units={quilmes?.total_units ?? 0}
            pct={totalSales > 0 ? Number(quilmes?.total_sales ?? 0) / totalSales * 100 : 0}
          />
          <LocationCard
            name="Mar del Plata"
            sales={Number(mdp?.total_sales ?? 0)}
            units={mdp?.total_units ?? 0}
            pct={totalSales > 0 ? Number(mdp?.total_sales ?? 0) / totalSales * 100 : 0}
          />
          <LocationCard
            name="Chascomús"
            sales={Number(chascomus?.total_sales ?? 0)}
            units={chascomus?.total_units ?? 0}
            pct={totalSales > 0 ? Number(chascomus?.total_sales ?? 0) / totalSales * 100 : 0}
          />
          <LocationCard
            name="Tienda Online"
            sales={Number(online?.total_sales ?? 0)}
            units={online?.total_units ?? 0}
            pct={0}
            isOnline
          />
        </div>
      </section>

      {/* Top productos + Colores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top productos */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Top 10 productos
          </h2>
          <div className="space-y-2">
            {topProducts.map((p, i) => {
              const sales  = Number(p.total_sales)
              const pct    = totalSales > 0 ? (sales / totalSales * 100) : 0
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-gray-300 text-xs truncate">{p.name}</span>
                      <span className="text-white text-xs font-medium flex-shrink-0">
                        {formatCurrency(sales)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(pct * 5, 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-500 text-xs w-12 text-right flex-shrink-0">
                        {p.total_units}u
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Colores + Talles */}
        <div className="space-y-6">

          {/* Colores */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-400 to-indigo-400" />
              Colores más vendidos
            </h2>
            <div className="space-y-2">
              {topColors.map((c) => {
                const units = c.total_units
                const maxU  = topColors[0]?.total_units || 1
                return (
                  <div key={c.color} className="flex items-center gap-3">
                    <span className="text-gray-300 text-xs w-36 truncate">{c.color}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full"
                        style={{ width: `${(units / maxU) * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs w-14 text-right">
                      {units.toLocaleString("es-AR")}u
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Talles */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              Distribución por talle
            </h2>
            <div className="space-y-2">
              {sizes.map((s) => {
                const maxU = sizes[0]?.total_units || 1
                const pct  = (s.total_units / sizes.reduce((a, x) => a + x.total_units, 0) * 100)
                return (
                  <div key={s.size} className="flex items-center gap-3">
                    <span className="text-gray-300 text-xs w-28 truncate">{s.size}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${(s.total_units / maxU) * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs w-14 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

        </div>
      </div>

    </div>
  )
}
