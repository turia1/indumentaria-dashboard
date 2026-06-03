import { db } from "@/lib/db"
import { customers, sales, saleItems } from "@/lib/db/schema"
import { eq, sql, desc } from "drizzle-orm"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Users, MapPin, ShoppingBag, TrendingUp } from "lucide-react"

export default async function ClientesPage() {
  // Clientes por provincia/ciudad
  const porProvincia = await db
    .select({
      provincia: customers.province,
      ciudad:    customers.city,
      cantidad:  sql<number>`COUNT(*)::int`,
    })
    .from(customers)
    .where(sql`${customers.province} IS NOT NULL`)
    .groupBy(customers.province, customers.city)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(15)

  // Totales
  const [totals] = await db
    .select({
      total:         sql<number>`COUNT(*)::int`,
      conEmail:      sql<number>`COUNT(CASE WHEN ${customers.email} IS NOT NULL THEN 1 END)::int`,
    })
    .from(customers)

  const totalClientes = totals?.total ?? 0
  const conEmail      = totals?.conEmail ?? 0

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <p className="text-gray-400 text-sm mt-0.5">Base de compradores de Tiendanube</p>
      </div>

      {/* Estado sin datos de Tiendanube */}
      {totalClientes === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Users className="w-14 h-14 text-gray-700 mx-auto mb-4" />
          <h2 className="text-white font-semibold text-lg mb-2">Sin datos de clientes todavía</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            Los datos de clientes se cargan cuando se integre la API de Tiendanube
            (Etapa 5 del desarrollo). Incluirá emails, ciudades, historial de compras y más.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left">
            {[
              { icon: Users,       label: "Emails de compradores",    desc: "Para email marketing" },
              { icon: MapPin,      label: "Ciudad y provincia",       desc: "Dónde te compran" },
              { icon: ShoppingBag, label: "Historial de compras",     desc: "Qué y cuándo compró" },
            ].map(item => (
              <div key={item.label} className="bg-gray-800/50 rounded-xl p-4">
                <item.icon className="w-5 h-5 text-indigo-400 mb-2" />
                <p className="text-gray-300 text-sm font-medium">{item.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm">Total clientes</p>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">{totalClientes.toLocaleString("es-AR")}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm">Con email</p>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">{conEmail.toLocaleString("es-AR")}</p>
              <p className="text-gray-500 text-xs mt-1">
                {totalClientes > 0 ? ((conEmail / totalClientes) * 100).toFixed(1) : 0}% del total
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-sm">Provincias</p>
                <MapPin className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {new Set(porProvincia.map(p => p.provincia)).size}
              </p>
            </div>
          </div>

          {/* Por provincia */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-yellow-400" />
              Compradores por provincia
            </h2>
            <div className="space-y-2">
              {porProvincia.map(p => {
                const pct = totalClientes > 0 ? (p.cantidad / totalClientes * 100) : 0
                return (
                  <div key={`${p.provincia}-${p.ciudad}`} className="flex items-center gap-3">
                    <span className="text-gray-300 text-sm w-40 truncate">{p.provincia}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-gray-400 text-xs w-16 text-right">
                      {p.cantidad} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
