import * as XLSX from "xlsx"
import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { config } from "dotenv"

config({ path: ".env.local" })
const sql = neon(process.env.DATABASE_URL)

const LOCS = { SHOW: "loc_1", TCH: "loc_2", TUR: "loc_3" }

// ─── PARSEAR EXCEL ───────────────────────────────────────────────────────────
function parseExcel(filePath) {
  const raw = XLSX.utils.sheet_to_json(
    XLSX.read(readFileSync(filePath), { type:"buffer" }).Sheets["Sheet"],
    { header:1, defval:"" }
  )
  const last   = raw[raw.length - 1]
  const umbralQ = (Number(last[22])||0) * 0.10
  const umbralM = (Number(last[23])||0) * 0.10

  let curArt="", curColor="", curGrupo=""
  const rows = []
  for (let i=5; i<raw.length; i++) {
    const r = raw[i]
    if (r[7]  && String(r[7]).trim())  curArt   = String(r[7]).trim()
    if (r[11] && String(r[11]).trim()) curColor  = String(r[11]).trim()
    if (r[2]  && String(r[2]).trim())  curGrupo  = String(r[2]).trim()
    const qT = Number(r[22])||0, mT = Number(r[23])||0
    if (!curArt || (qT===0&&mT===0) || qT>umbralQ || Math.abs(mT)>umbralM) continue
    rows.push({ art:curArt, color:curColor||null, grupo:curGrupo||null,
      talle:String(r[13]||"").trim()||null,
      qShow:Number(r[15])||0, mShow:Number(r[16])||0,
      qTch: Number(r[18])||0, mTch: Number(r[19])||0,
      qTur: Number(r[20])||0, mTur: Number(r[21])||0,
      qTotal:qT, mTotal:mT })
  }
  return rows
}

// ─── CHUNK HELPER ────────────────────────────────────────────────────────────
function chunks(arr, size) {
  const out = []
  for (let i=0; i<arr.length; i+=size) out.push(arr.slice(i,i+size))
  return out
}

async function main(filePath, year) {
  console.log(`\nImportando: ${filePath} | Año: ${year}\n`)
  const rows = parseExcel(filePath)
  console.log(`Filas válidas: ${rows.length}`)

  // ── 1. PRODUCTOS ─────────────────────────────────────────────────────────
  console.log("\nPASO 1: Productos...")
  const artNames = [...new Set(rows.map(r=>r.art))]
  const artMeta  = new Map()
  for (const art of artNames) {
    const m   = art.match(/^(\d+)\s+(.+)$/)
    const row = rows.find(r=>r.art===art)
    artMeta.set(art, {
      sku:      m ? m[1] : null,
      name:     m ? m[2].trim() : art.trim(),
      category: art.toUpperCase().includes("OFERTA") ? "OFERTA" : (row?.grupo||"GENERAL")
    })
  }

  // Insert todos — ON CONFLICT DO NOTHING en el id (PK)
  let inserted = 0
  for (const ch of chunks(artNames, 50)) {
    for (const art of ch) {
      const { sku, name, category } = artMeta.get(art)
      await sql`
        INSERT INTO products (id, external_id, sku, name, category, active)
        VALUES (${crypto.randomUUID()}, ${sku}, ${sku}, ${name}, ${category}, true)
        ON CONFLICT DO NOTHING
      `
      inserted++
    }
    process.stdout.write(`\r  ${inserted}/${artNames.length} `)
  }
  console.log()

  // Leer todos los productos para armar el mapa id
  const allProds = await sql`SELECT id, sku, name FROM products WHERE sku IS NOT NULL OR name IS NOT NULL`
  const prodIdMap = new Map()
  for (const p of allProds) {
    for (const [art, meta] of artMeta) {
      if ((meta.sku && meta.sku === p.sku) || meta.name === p.name) {
        prodIdMap.set(art, p.id)
        break
      }
    }
  }
  console.log(`  ✓ ${artNames.length} productos procesados`)

  // ── 2. VARIANTES ─────────────────────────────────────────────────────────
  console.log("\nPASO 2: Variantes...")
  const vKey   = (art,color,talle) => `${art}|||${color||""}|||${talle||""}`
  const varSet = new Map()
  for (const r of rows) {
    const k = vKey(r.art, r.color, r.talle)
    if (!varSet.has(k)) {
      const productId = prodIdMap.get(r.art)
      if (!productId) continue
      varSet.set(k, { id: crypto.randomUUID(), product_id: productId, size: r.talle, color: r.color })
    }
  }

  let vInserted = 0
  for (const v of varSet.values()) {
    await sql`
      INSERT INTO product_variants (id, product_id, size, color, current_stock, min_stock_alert)
      VALUES (${v.id}, ${v.product_id}, ${v.size}, ${v.color}, 0, 2)
      ON CONFLICT DO NOTHING
    `
    vInserted++
    if (vInserted % 100 === 0) process.stdout.write(`\r  ${vInserted}/${varSet.size} `)
  }
  console.log(`\r  ✓ ${varSet.size} variantes procesadas`)

  // Leer variantes reales para tener IDs correctos
  const prodIds = [...new Set([...varSet.values()].map(v=>v.product_id))]
  const varIdMap = new Map()
  for (const ch of chunks(prodIds, 50)) {
    const placeholders = ch.map((_,i)=>`$${i+1}`).join(",")
    const res = await sql.query(
      `SELECT id, product_id, COALESCE(size,'') s, COALESCE(color,'') c
       FROM product_variants WHERE product_id IN (${placeholders})`,
      ch
    )
    for (const row of (res.rows || res)) {
      // Reconstruir vKey buscando el art
      for (const [k, v] of varSet) {
        if (v.product_id === row.product_id &&
            (v.size||"") === row.s &&
            (v.color||"") === row.c) {
          varIdMap.set(k, row.id)
        }
      }
    }
  }
  console.log(`  ✓ ${varIdMap.size} variantes mapeadas`)

  // ── 3. VENTAS ANUALES ────────────────────────────────────────────────────
  console.log(`\nPASO 3: Ventas anuales ${year}...`)
  const annualDate = `${year}-12-31`
  const locEntries = [
    { id: LOCS.SHOW, tag:"SHOW", getQ:r=>r.qShow, getM:r=>r.mShow },
    { id: LOCS.TCH,  tag:"TCH",  getQ:r=>r.qTch,  getM:r=>r.mTch  },
    { id: LOCS.TUR,  tag:"TUR",  getQ:r=>r.qTur,  getM:r=>r.mTur  },
  ]

  // Agregar por variante+local
  const salesAgg = new Map()
  for (const r of rows) {
    for (const loc of locEntries) {
      const q=loc.getQ(r), m=loc.getM(r)
      if (!q && !m) continue
      const k = `${year}_${loc.tag}_${vKey(r.art,r.color,r.talle)}`
      const e = salesAgg.get(k) || { extId:k.substring(0,200), locId:loc.id, art:r.art, vk:vKey(r.art,r.color,r.talle), q:0, m:0 }
      e.q+=q; e.m+=m
      salesAgg.set(k, e)
    }
  }

  let sCreated=0, sSkipped=0
  let batch = 0
  for (const [k, e] of salesAgg) {
    if (e.q<=0 && e.m<=0) continue
    const varId = varIdMap.get(e.vk) || null

    const saleId = crypto.randomUUID()
    await sql`
      INSERT INTO sales (id, external_id, source, location_id, date, subtotal, total, status, notes)
      VALUES (
        ${saleId}, ${e.extId}, 'zoologic', ${e.locId}, ${annualDate},
        ${e.m.toFixed(2)}, ${e.m.toFixed(2)}, 'completed',
        ${`Anual ${year} | ${e.art.substring(0,60)} | ${e.q}u`}
      )
      ON CONFLICT DO NOTHING
    `

    if (varId) {
      await sql`
        INSERT INTO sale_items (id, sale_id, product_variant_id, product_name, quantity, unit_price, subtotal)
        VALUES (
          ${crypto.randomUUID()}, ${saleId}, ${varId},
          ${e.art.substring(0,200)}, ${e.q},
          ${e.q>0?(e.m/e.q).toFixed(2):"0"}, ${e.m.toFixed(2)}
        )
        ON CONFLICT DO NOTHING
      `
    }

    sCreated++
    if (sCreated % 50 === 0) process.stdout.write(`\r  ${sCreated}/${salesAgg.size} `)
  }
  console.log(`\r  ✓ ${sCreated} ventas importadas`)

  // ── 4. KPIS ──────────────────────────────────────────────────────────────
  console.log("\nPASO 4: KPIs anuales...")
  for (const loc of locEntries) {
    const t = rows.reduce((a,r)=>({q:a.q+loc.getQ(r),m:a.m+loc.getM(r)}),{q:0,m:0})
    if (!t.q) continue
    // Usar DELETE + INSERT para evitar problemas con índice parcial
    await sql`DELETE FROM daily_kpis WHERE location_id=${loc.id} AND date=${annualDate}`
    await sql`
      INSERT INTO daily_kpis (id, location_id, date, total_sales, transaction_count, avg_ticket, updated_at)
      VALUES (${crypto.randomUUID()}, ${loc.id}, ${annualDate}, ${t.m.toFixed(2)}, ${t.q}, ${(t.m/t.q).toFixed(2)}, now())
    `
  }
  console.log("  ✓ KPIs actualizados")

  const tot = rows.reduce((a,r)=>({q:a.q+r.qTotal,m:a.m+r.mTotal}),{q:0,m:0})
  const fmt = n=>`$${Math.round(n).toLocaleString("es-AR")}`
  console.log(`
${"═".repeat(50)}
  IMPORTACIÓN COMPLETADA ✓
${"═".repeat(50)}
  Año:         ${year}
  Productos:   ${artNames.length}
  Variantes:   ${varSet.size}
  Ventas:      ${sCreated} registros
  Unidades:    ${tot.q.toLocaleString("es-AR")}
  Facturación: ${fmt(tot.m)}
${"═".repeat(50)}
`)
}

const fp = process.argv[2] || "C:\\Users\\diego\\Downloads\\20260602 0605 Ventas por articulo.XLSX"
const yr = parseInt(process.argv[3] || "2025")
main(fp, yr).catch(e=>{ console.error("Error:", e.message, e.stack); process.exit(1) })
