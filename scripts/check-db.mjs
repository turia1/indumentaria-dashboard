import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL)

const prods  = await sql`SELECT COUNT(*)::int as n FROM products`
const vars   = await sql`SELECT COUNT(*)::int as n FROM product_variants`
const sales  = await sql`SELECT COUNT(*)::int as n, ROUND(SUM(total::numeric)) as total FROM sales`
const items  = await sql`SELECT COUNT(*)::int as n FROM sale_items`
const locs   = await sql`SELECT l.name, COUNT(s.id)::int as ventas, ROUND(SUM(s.total::numeric)) as monto
                          FROM locations l LEFT JOIN sales s ON s.location_id = l.id
                          GROUP BY l.name ORDER BY monto DESC NULLS LAST`

console.log("\n=== ESTADO DE LA BASE DE DATOS ===")
console.log(`Productos:   ${prods[0].n.toLocaleString("es-AR")}`)
console.log(`Variantes:   ${vars[0].n.toLocaleString("es-AR")}`)
console.log(`Ventas:      ${sales[0].n.toLocaleString("es-AR")} registros`)
console.log(`Items venta: ${items[0].n.toLocaleString("es-AR")}`)
console.log(`Facturación: $${Number(sales[0].total || 0).toLocaleString("es-AR")}`)
console.log("\n=== VENTAS POR LOCAL ===")
locs.forEach(l => {
  const m = Number(l.monto || 0)
  console.log(`  ${l.name.padEnd(20)} ${String(l.ventas || 0).padStart(5)} ventas   $${m.toLocaleString("es-AR")}`)
})
