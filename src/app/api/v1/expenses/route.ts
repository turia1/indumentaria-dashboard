import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { expenses, expenseCategories } from "@/lib/db/schema"
import { desc, eq, and, gte, lte, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

// GET /api/v1/expenses — listar gastos con filtros opcionales
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to   = searchParams.get("to")
  const cat  = searchParams.get("category")

  const conditions = []
  if (from) conditions.push(gte(expenses.date, from))
  if (to)   conditions.push(lte(expenses.date, to))
  if (cat)  conditions.push(eq(expenses.categoryId, cat))

  const rows = await db
    .select({
      id:          expenses.id,
      amount:      expenses.amount,
      currency:    expenses.currency,
      date:        expenses.date,
      description: expenses.description,
      receiptUrl:  expenses.receiptUrl,
      createdAt:   expenses.createdAt,
      category: {
        id:    expenseCategories.id,
        name:  expenseCategories.name,
        type:  expenseCategories.type,
        color: expenseCategories.color,
      },
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expenses.date))
    .limit(200)

  // Totales
  const [totals] = await db
    .select({
      total:    sql<string>`COALESCE(SUM(${expenses.amount}::numeric), 0)`,
      count:    sql<number>`COUNT(*)::int`,
    })
    .from(expenses)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  return NextResponse.json({ expenses: rows, totals })
}

// POST /api/v1/expenses — crear gasto
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Solo admin, manager y accountant pueden cargar gastos
  const allowedRoles = ["admin", "manager", "accountant"]
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const body = await req.json()
  const { amount, categoryId, date, description, locationId, receiptUrl } = body

  if (!amount || !date || !description) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const [expense] = await db
    .insert(expenses)
    .values({
      id:          crypto.randomUUID(),
      amount:      String(amount),
      currency:    "ARS",
      categoryId:  categoryId || null,
      locationId:  locationId || null,
      date,
      description,
      receiptUrl:  receiptUrl || null,
      createdBy:   session.user.id,
    })
    .returning()

  return NextResponse.json({ expense }, { status: 201 })
}

// DELETE /api/v1/expenses — eliminar gasto
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (!["admin", "manager"].includes(session.user.role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await db.delete(expenses).where(eq(expenses.id, id))
  return NextResponse.json({ ok: true })
}
