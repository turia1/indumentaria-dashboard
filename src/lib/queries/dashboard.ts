import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

// ─── VENTAS TOTALES POR AÑO ───────────────────────────────────────────────────
export async function getAnualSummary(year: number = 2025) {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int                          AS transaction_count,
      COALESCE(SUM(s.total::numeric), 0)     AS total_sales,
      COALESCE(AVG(s.total::numeric), 0)     AS avg_ticket,
      COALESCE(SUM(si.quantity), 0)::int     AS total_units
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    WHERE s.source = 'zoologic'
      AND EXTRACT(YEAR FROM s.date) = ${year}
  `)
  return result.rows[0] as {
    transaction_count: number
    total_sales: string
    avg_ticket: string
    total_units: number
  }
}

// ─── VENTAS POR LOCAL ────────────────────────────────────────────────────────
export async function getSalesByLocation(year: number = 2025) {
  const result = await db.execute(sql`
    SELECT
      l.id,
      l.name,
      l.type,
      COUNT(s.id)::int                        AS transaction_count,
      COALESCE(SUM(s.total::numeric), 0)      AS total_sales,
      COALESCE(SUM(si.quantity), 0)::int      AS total_units
    FROM locations l
    LEFT JOIN sales s
      ON s.location_id = l.id
      AND s.source = 'zoologic'
      AND EXTRACT(YEAR FROM s.date) = ${year}
    LEFT JOIN sale_items si ON si.sale_id = s.id
    GROUP BY l.id, l.name, l.type
    ORDER BY total_sales DESC
  `)
  return result.rows as Array<{
    id: string
    name: string
    type: string
    transaction_count: number
    total_sales: string
    total_units: number
  }>
}

// ─── TOP PRODUCTOS ────────────────────────────────────────────────────────────
export async function getTopProducts(year: number = 2025, limit: number = 15) {
  const result = await db.execute(sql`
    SELECT
      p.id,
      p.name,
      p.sku,
      p.category,
      SUM(si.quantity)::int                  AS total_units,
      SUM(si.subtotal::numeric)              AS total_sales
    FROM sale_items si
    JOIN product_variants pv ON pv.id = si.product_variant_id
    JOIN products p           ON p.id = pv.product_id
    JOIN sales s              ON s.id = si.sale_id
    WHERE s.source = 'zoologic'
      AND EXTRACT(YEAR FROM s.date) = ${year}
      AND p.category != 'OFERTA'
    GROUP BY p.id, p.name, p.sku, p.category
    ORDER BY total_sales DESC
    LIMIT ${limit}
  `)
  return result.rows as Array<{
    id: string
    name: string
    sku: string | null
    category: string | null
    total_units: number
    total_sales: string
  }>
}

// ─── TOP COLORES ─────────────────────────────────────────────────────────────
export async function getTopColors(year: number = 2025, limit: number = 8) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(pv.color, 'Sin color')        AS color,
      SUM(si.quantity)::int                  AS total_units,
      SUM(si.subtotal::numeric)              AS total_sales
    FROM sale_items si
    JOIN product_variants pv ON pv.id = si.product_variant_id
    JOIN sales s              ON s.id = si.sale_id
    WHERE s.source = 'zoologic'
      AND EXTRACT(YEAR FROM s.date) = ${year}
      AND pv.color IS NOT NULL
    GROUP BY pv.color
    ORDER BY total_units DESC
    LIMIT ${limit}
  `)
  return result.rows as Array<{
    color: string
    total_units: number
    total_sales: string
  }>
}

// ─── DISTRIBUCIÓN POR TALLE ──────────────────────────────────────────────────
export async function getSizeDistribution(year: number = 2025) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(pv.size, 'Sin talle')         AS size,
      SUM(si.quantity)::int                  AS total_units
    FROM sale_items si
    JOIN product_variants pv ON pv.id = si.product_variant_id
    JOIN sales s              ON s.id = si.sale_id
    WHERE s.source = 'zoologic'
      AND EXTRACT(YEAR FROM s.date) = ${year}
      AND pv.size IS NOT NULL
    GROUP BY pv.size
    ORDER BY total_units DESC
    LIMIT 10
  `)
  return result.rows as Array<{ size: string; total_units: number }>
}

// ─── ALERTAS DE STOCK BAJO ────────────────────────────────────────────────────
export async function getLowStockAlerts(limit: number = 10) {
  const result = await db.execute(sql`
    SELECT
      p.name,
      p.sku,
      pv.color,
      pv.size,
      pv.current_stock,
      pv.min_stock_alert
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.current_stock <= pv.min_stock_alert
      AND p.active = true
    ORDER BY pv.current_stock ASC
    LIMIT ${limit}
  `)
  return result.rows as Array<{
    name: string
    sku: string | null
    color: string | null
    size: string | null
    current_stock: number
    min_stock_alert: number
  }>
}
