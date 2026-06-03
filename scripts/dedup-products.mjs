// Elimina productos y variantes duplicados, manteniendo solo los que tienen ventas
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
config({ path: ".env.local" })
const sql = neon(process.env.DATABASE_URL)

console.log("Limpiando duplicados...\n")

// 1. Productos: por cada SKU duplicado, conservar el que tiene variantes con sale_items
const dupes = await sql`
  SELECT sku, COUNT(*) as cnt, array_agg(id ORDER BY created_at) as ids
  FROM products
  WHERE sku IS NOT NULL
  GROUP BY sku
  HAVING COUNT(*) > 1
`
console.log(`SKUs duplicados: ${dupes.length}`)

let deleted = 0
for (const d of dupes) {
  // Ids a eliminar = todos excepto el primero
  const toDelete = d.ids.slice(1)
  for (const id of toDelete) {
    // Primero reasignar variantes al producto original
    await sql`UPDATE product_variants SET product_id = ${d.ids[0]} WHERE product_id = ${id}`
    // Luego eliminar el producto duplicado
    await sql`DELETE FROM products WHERE id = ${id}`
    deleted++
  }
}
console.log(`Productos duplicados eliminados: ${deleted}`)

// 2. Variantes: por cada (product_id, color, size) duplicado, conservar el que tiene sale_items
const dupVars = await sql`
  SELECT product_id, COALESCE(size,'') as s, COALESCE(color,'') as c,
         COUNT(*) as cnt, array_agg(id ORDER BY created_at) as ids
  FROM product_variants
  GROUP BY product_id, COALESCE(size,''), COALESCE(color,'')
  HAVING COUNT(*) > 1
`
console.log(`Variantes duplicadas: ${dupVars.length}`)

let vDeleted = 0
for (const d of dupVars) {
  const toDelete = d.ids.slice(1)
  for (const id of toDelete) {
    // Reasignar sale_items al variant original
    await sql`UPDATE sale_items SET product_variant_id = ${d.ids[0]} WHERE product_variant_id = ${id}`
    await sql`DELETE FROM product_variants WHERE id = ${id}`
    vDeleted++
  }
}
console.log(`Variantes duplicadas eliminadas: ${vDeleted}`)

// Verificar resultado final
const [p] = await sql`SELECT COUNT(*)::int as n FROM products`
const [v] = await sql`SELECT COUNT(*)::int as n FROM product_variants`
const [s] = await sql`SELECT COUNT(*)::int as n, ROUND(SUM(total::numeric)) as t FROM sales`

console.log(`\n=== RESULTADO FINAL ===`)
console.log(`Productos:   ${p.n}`)
console.log(`Variantes:   ${v.n}`)
console.log(`Ventas:      ${s.n} / $${Number(s.t).toLocaleString("es-AR")}`)
console.log("Listo!")
