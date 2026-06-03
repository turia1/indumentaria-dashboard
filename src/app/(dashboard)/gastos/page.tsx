import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { expenses, expenseCategories, locations } from "@/lib/db/schema"
import { desc, sql } from "drizzle-orm"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ExpenseForm } from "@/components/forms/expense-form"
import { DollarSign, TrendingDown, Calendar, Tag } from "lucide-react"

export default async function GastosPage() {
  const session = await auth()

  const canAdd = ["admin", "manager", "accountant"].includes(session?.user?.role ?? "")

  // Cargar datos en paralelo
  const [recentExpenses, categories, locs, totals] = await Promise.all([
    db
      .select({
        id:          expenses.id,
        amount:      expenses.amount,
        currency:    expenses.currency,
        date:        expenses.date,
        description: expenses.description,
        categoryName: expenseCategories.name,
        categoryColor: expenseCategories.color,
        categoryType: expenseCategories.type,
      })
      .from(expenses)
      .leftJoin(expenseCategories, sql`${expenses.categoryId} = ${expenseCategories.id}`)
      .orderBy(desc(expenses.date))
      .limit(50),

    db.select().from(expenseCategories).orderBy(expenseCategories.name),

    db.select({ id: locations.id, name: locations.name })
      .from(locations)
      .orderBy(locations.name),

    db
      .select({
        total:  sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
        count:  sql<number>`COUNT(*)::int`,
      })
      .from(expenses),
  ])

  const totalMonto = Number(totals[0]?.total ?? 0)
  const totalCount = totals[0]?.count ?? 0

  // Totales por categoría
  const byCat = await db
    .select({
      catName:  expenseCategories.name,
      catColor: expenseCategories.color,
      catType:  expenseCategories.type,
      total:    sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
      count:    sql<number>`COUNT(*)::int`,
    })
    .from(expenses)
    .leftJoin(expenseCategories, sql`${expenses.categoryId} = ${expenseCategories.id}`)
    .groupBy(expenseCategories.name, expenseCategories.color, expenseCategories.type)
    .orderBy(sql`SUM(${expenses.amount}::numeric) DESC`)

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gastos</h1>
          <p className="text-gray-400 text-sm mt-0.5">Control de egresos del negocio</p>
        </div>
        {canAdd && (
          <ExpenseForm categories={categories} locations={locs} />
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-sm">Total gastos</p>
            <div className="p-2 rounded-xl bg-gray-800 text-red-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalMonto)}</p>
          <p className="text-gray-500 text-xs mt-1">{totalCount} registros cargados</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-sm">Categorías</p>
            <div className="p-2 rounded-xl bg-gray-800 text-yellow-400">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{categories.length}</p>
          <p className="text-gray-500 text-xs mt-1">tipos de gasto configurados</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-sm">Último gasto</p>
            <div className="p-2 rounded-xl bg-gray-800 text-orange-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            {recentExpenses[0] ? formatDate(recentExpenses[0].date) : "—"}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {recentExpenses[0]?.description?.substring(0, 30) ?? "Sin gastos cargados"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tabla de gastos */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <h2 className="text-white font-semibold">Últimos gastos</h2>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Sin gastos cargados</p>
              <p className="text-gray-600 text-sm mt-1">
                {canAdd ? "Usá el botón \"+ Nuevo gasto\" para empezar" : "Los gastos aparecerán aquí"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {recentExpenses.map((e) => (
                <div key={e.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: e.categoryColor ?? "#6b7280" }}
                    />
                    <div className="min-w-0">
                      <p className="text-gray-200 text-sm truncate">{e.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-gray-500 text-xs">{formatDate(e.date)}</span>
                        {e.categoryName && (
                          <span className="text-gray-600 text-xs">· {e.categoryName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-red-400 font-semibold text-sm flex-shrink-0 ml-4">
                    {formatCurrency(Number(e.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por categoría */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Por categoría</h2>
          {byCat.filter(c => Number(c.total) > 0).length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {byCat.filter(c => Number(c.total) > 0).map((c) => {
                const pct = totalMonto > 0 ? Number(c.total) / totalMonto * 100 : 0
                return (
                  <div key={c.catName ?? "sin-cat"}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: c.catColor ?? "#6b7280" }}
                        />
                        <span className="text-gray-300 text-xs">{c.catName ?? "Sin categoría"}</span>
                      </div>
                      <span className="text-gray-400 text-xs">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: c.catColor ?? "#6b7280" }}
                        />
                      </div>
                      <span className="text-white text-xs w-20 text-right">
                        {formatCurrency(Number(c.total))}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
