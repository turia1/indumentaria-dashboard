import { auth } from "@/lib/auth"
import { KpiCard } from "@/components/dashboard/kpi-card"
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Users,
  Package,
  Megaphone,
  Store,
  Globe,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default async function DashboardPage() {
  const session = await auth()

  // Por ahora datos de ejemplo — en Etapa 4 conectamos a la DB real
  const kpis = {
    ventasHoy: 0,
    ventasMes: 0,
    ticketPromedio: 0,
    transacciones: 0,
    ventasLocal1: 0,
    ventasLocal2: 0,
    ventasLocal3: 0,
    ventasOnline: 0,
    gastosMes: 0,
    margenMes: 0,
    stockCritico: 0,
    clientesNuevos: 0,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Bienvenido, {session?.user?.name?.split(" ")[0]} 👋
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-gray-400 text-sm">En vivo</span>
        </div>
      </div>

      {/* Alerta de configuración inicial */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4">
        <p className="text-indigo-300 text-sm font-medium">
          🚀 Proyecto iniciado correctamente. Próximo paso: conectar la base de datos en Neon.
        </p>
      </div>

      {/* KPIs principales */}
      <div>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Resumen del día
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Ventas hoy"
            value={formatCurrency(kpis.ventasHoy)}
            change={0}
            changeLabel="vs ayer"
            icon={ShoppingBag}
            iconColor="text-indigo-400"
          />
          <KpiCard
            title="Transacciones"
            value={kpis.transacciones.toString()}
            change={0}
            changeLabel="vs ayer"
            icon={TrendingUp}
            iconColor="text-emerald-400"
          />
          <KpiCard
            title="Ticket promedio"
            value={formatCurrency(kpis.ticketPromedio)}
            change={0}
            changeLabel="vs ayer"
            icon={DollarSign}
            iconColor="text-yellow-400"
          />
          <KpiCard
            title="Clientes nuevos"
            value={kpis.clientesNuevos.toString()}
            change={0}
            changeLabel="vs ayer"
            icon={Users}
            iconColor="text-pink-400"
          />
        </div>
      </div>

      {/* Ventas por local */}
      <div>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Ventas por canal — este mes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Local 1"
            value={formatCurrency(kpis.ventasLocal1)}
            icon={Store}
            iconColor="text-blue-400"
          />
          <KpiCard
            title="Local 2"
            value={formatCurrency(kpis.ventasLocal2)}
            icon={Store}
            iconColor="text-blue-400"
          />
          <KpiCard
            title="Local 3"
            value={formatCurrency(kpis.ventasLocal3)}
            icon={Store}
            iconColor="text-blue-400"
          />
          <KpiCard
            title="Tienda online"
            value={formatCurrency(kpis.ventasOnline)}
            icon={Globe}
            iconColor="text-purple-400"
          />
        </div>
      </div>

      {/* Financiero */}
      <div>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Financiero — este mes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            title="Ventas del mes"
            value={formatCurrency(kpis.ventasMes)}
            change={0}
            changeLabel="vs mes anterior"
            icon={ShoppingBag}
            iconColor="text-emerald-400"
          />
          <KpiCard
            title="Gastos del mes"
            value={formatCurrency(kpis.gastosMes)}
            change={0}
            changeLabel="vs mes anterior"
            icon={DollarSign}
            iconColor="text-red-400"
          />
          <KpiCard
            title="Margen bruto"
            value={`${kpis.margenMes.toFixed(1)}%`}
            change={0}
            changeLabel="vs mes anterior"
            icon={TrendingUp}
            iconColor="text-emerald-400"
          />
        </div>
      </div>

      {/* Alertas */}
      <div>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
          Estado del sistema
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-medium text-white">Stock crítico</p>
            </div>
            <p className="text-3xl font-bold text-white">{kpis.stockCritico}</p>
            <p className="text-gray-500 text-xs mt-1">Productos con stock bajo</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Megaphone className="w-4 h-4 text-indigo-400" />
              <p className="text-sm font-medium text-white">Sincronización</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <p className="text-yellow-400 text-sm">Pendiente configuración</p>
            </div>
            <p className="text-gray-500 text-xs mt-1">Conectá Neon para activar los datos</p>
          </div>
        </div>
      </div>
    </div>
  )
}
