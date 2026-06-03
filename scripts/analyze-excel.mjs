import * as XLSX from "xlsx"
import { readFileSync } from "fs"

const filePath = "C:\\Users\\diego\\Downloads\\20260602 0605 Ventas por articulo.XLSX"
const buf = readFileSync(filePath)
const wb = XLSX.read(buf, { type: "buffer" })
const ws = wb.Sheets["Sheet"]
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

// MAPA DE COLUMNAS (confirmado):
// [7]  = Artículo
// [11] = Color
// [13] = Talle
// [2]  = Grupo
// [15] = SHOWROOM Cantidad
// [16] = SHOWROOM Monto
// [18] = TCHASCO Cantidad
// [19] = TCHASCO Monto
// [20] = TURIA Cantidad
// [21] = TURIA Monto
// [22] = Total Cantidad
// [23] = Total Monto

const fmt = n => `$${Math.round(n).toLocaleString("es-AR")}`
const pct = (p, t) => t > 0 ? (p/t*100).toFixed(1)+"%" : "0%"

// Calcular el total general real del negocio (última fila con datos)
// para usarlo como umbral de detección de filas-resumen
const lastRow = raw[raw.length - 1]
const TOTAL_REAL_MONTO = Number(lastRow[23]) || 0
const TOTAL_REAL_UNID  = Number(lastRow[22]) || 0

// Umbral: si una fila tiene más del 10% del total → es subtotal, saltear
const UMBRAL_MONTO = TOTAL_REAL_MONTO * 0.10
const UMBRAL_UNID  = TOTAL_REAL_UNID  * 0.10

// Leer filas de datos (desde fila 5)
let currentArticulo = ""
let currentColor    = ""
let currentGrupo    = ""
const rows = []

for (let i = 5; i < raw.length; i++) {
  const r = raw[i]

  // Actualizar artículo (herencia)
  if (r[7] && String(r[7]).trim()) currentArticulo = String(r[7]).trim()
  if (r[11] && String(r[11]).trim()) currentColor  = String(r[11]).trim()
  if (r[2]  && String(r[2]).trim())  currentGrupo  = String(r[2]).trim()

  const talle  = String(r[13] || "").trim()
  const qShow  = Number(r[15]) || 0
  const mShow  = Number(r[16]) || 0
  const qTch   = Number(r[18]) || 0
  const mTch   = Number(r[19]) || 0
  const qTur   = Number(r[20]) || 0
  const mTur   = Number(r[21]) || 0
  const qTotal = Number(r[22]) || 0
  const mTotal = Number(r[23]) || 0

  // Saltar filas sin ventas
  if (qTotal === 0 && mTotal === 0) continue
  // Saltar filas que son subtotales/totales (superan el umbral)
  if (qTotal > UMBRAL_UNID || Math.abs(mTotal) > UMBRAL_MONTO) continue
  // Saltar si no hay artículo en contexto
  if (!currentArticulo) continue

  rows.push({
    articulo: currentArticulo,
    color:    currentColor,
    grupo:    currentGrupo,
    talle,
    qShow, mShow,
    qTch,  mTch,
    qTur,  mTur,
    qTotal, mTotal
  })
}

// Totales reales
const totShow = rows.reduce((a,r)=>({q:a.q+r.qShow,m:a.m+r.mShow}),{q:0,m:0})
const totTch  = rows.reduce((a,r)=>({q:a.q+r.qTch, m:a.m+r.mTch }),{q:0,m:0})
const totTur  = rows.reduce((a,r)=>({q:a.q+r.qTur, m:a.m+r.mTur }),{q:0,m:0})
const totAll  = rows.reduce((a,r)=>({q:a.q+r.qTotal,m:a.m+r.mTotal}),{q:0,m:0})

// Agrupación por artículo
const byArt = {}
for (const r of rows) {
  if (!byArt[r.articulo]) byArt[r.articulo] = { q:0,m:0,show:0,tch:0,tur:0,grupo:r.grupo }
  byArt[r.articulo].q    += r.qTotal
  byArt[r.articulo].m    += r.mTotal
  byArt[r.articulo].show += r.mShow
  byArt[r.articulo].tch  += r.mTch
  byArt[r.articulo].tur  += r.mTur
}

console.log("=".repeat(70))
console.log("  ANÁLISIS ANUAL VENTAS 2025 — INDUMENTARIA FEMENINA")
console.log("=".repeat(70))

console.log(`
VOLUMEN TOTAL DEL NEGOCIO
  Unidades vendidas:   ${totAll.q.toLocaleString("es-AR")}
  Facturación total:   ${fmt(totAll.m)}
  Artículos distintos: ${Object.keys(byArt).length}
  Precio prom/unidad:  ${fmt(totAll.m / totAll.q)}
`)

console.log("─".repeat(70))
console.log("VENTAS POR LOCAL / CANAL")
console.log("─".repeat(70))
console.log(`  Showroom Quilmes:    ${String(totShow.q).padStart(6)} unid   ${fmt(totShow.m).padStart(22)}   ${pct(totShow.m,totAll.m)}`)
console.log(`  Chascomús:           ${String(totTch.q).padStart(6)} unid   ${fmt(totTch.m).padStart(22)}   ${pct(totTch.m,totAll.m)}`)
console.log(`  Mar del Plata:       ${String(totTur.q).padStart(6)} unid   ${fmt(totTur.m).padStart(22)}   ${pct(totTur.m,totAll.m)}`)
console.log(`  ${"─".repeat(66)}`)
console.log(`  TOTAL:               ${String(totAll.q).padStart(6)} unid   ${fmt(totAll.m).padStart(22)}   100%`)
console.log(`  ⚠ WEB integrada en Showroom — reporte no separa canal online`)

// Top 30 por monto
const top30 = Object.entries(byArt).sort((a,b)=>b[1].m-a[1].m).slice(0,30)
console.log(`\n${"─".repeat(70)}`)
console.log("TOP 30 PRODUCTOS POR FACTURACIÓN")
console.log("─".repeat(70))
let acumM = 0
top30.forEach(([art,v],i)=>{
  acumM += v.m
  console.log(`${String(i+1).padStart(2)}. ${art.substring(0,42).padEnd(42)} ${String(v.q).padStart(5)}u  ${fmt(v.m).padStart(20)}  ${pct(v.m,totAll.m).padStart(5)}`)
})
console.log(`   TOP 30 acumula: ${pct(acumM, totAll.m)} de la facturación`)

// Top 20 por cantidad
const top20q = Object.entries(byArt).sort((a,b)=>b[1].q-a[1].q).slice(0,20)
console.log(`\n${"─".repeat(70)}`)
console.log("TOP 20 PRODUCTOS POR UNIDADES")
console.log("─".repeat(70))
top20q.forEach(([art,v],i)=>{
  console.log(`${String(i+1).padStart(2)}. ${art.substring(0,42).padEnd(42)} ${String(v.q).padStart(5)}u  ${fmt(v.m).padStart(20)}`)
})

// Talles
const byTalle = {}
for(const r of rows){
  if(!r.talle) continue
  if(!byTalle[r.talle]) byTalle[r.talle]={q:0,m:0}
  byTalle[r.talle].q+=r.qTotal; byTalle[r.talle].m+=r.mTotal
}
const talles = Object.entries(byTalle).sort((a,b)=>b[1].q-a[1].q)
console.log(`\n${"─".repeat(70)}`)
console.log("DISTRIBUCIÓN POR TALLE")
console.log("─".repeat(70))
talles.forEach(([t,v])=>{
  const bar="█".repeat(Math.min(40,Math.round(v.q/totAll.q*120)))
  console.log(`  ${t.padEnd(22)} ${String(v.q).padStart(5)}u  ${pct(v.q,totAll.q).padStart(5)}  ${bar}`)
})

// Colores
const byColor = {}
for(const r of rows){
  if(!r.color) continue
  if(!byColor[r.color]) byColor[r.color]={q:0,m:0}
  byColor[r.color].q+=r.qTotal; byColor[r.color].m+=r.mTotal
}
const top15c = Object.entries(byColor).sort((a,b)=>b[1].q-a[1].q).slice(0,15)
console.log(`\n${"─".repeat(70)}`)
console.log("TOP 15 COLORES")
console.log("─".repeat(70))
top15c.forEach(([c,v])=>{
  console.log(`  ${c.padEnd(26)} ${String(v.q).padStart(5)}u  ${pct(v.q,totAll.q).padStart(5)}  ${fmt(v.m).padStart(20)}`)
})

// Grupo OF / OFERTA
const oferts = Object.entries(byArt).filter(([k])=>
  k.toUpperCase().includes("OFERTA") || /^\d+\s*OF/.test(k.toUpperCase())
)
const ofTot = oferts.reduce((a,[,v])=>({q:a.q+v.q,m:a.m+v.m}),{q:0,m:0})
console.log(`\n${"─".repeat(70)}`)
console.log("GRUPO OF — SEGUNDA SELECCIÓN / LIQUIDACIÓN")
console.log("─".repeat(70))
oferts.sort((a,b)=>b[1].q-a[1].q).forEach(([art,v])=>{
  console.log(`  ${art.substring(0,45).padEnd(45)} ${String(v.q).padStart(5)}u  ${fmt(v.m).padStart(18)}`)
})
console.log(`  SUBTOTAL: ${ofTot.q}u  ${fmt(ofTot.m)}  (${pct(ofTot.m,totAll.m)} del total)`)

// Baja rotación
const bajaRot = Object.entries(byArt).filter(([,v])=>v.q<=3)
const soloShow = Object.entries(byArt).filter(([,v])=>v.show>0&&v.tch===0&&v.tur===0)
const soloTch  = Object.entries(byArt).filter(([,v])=>v.tch>0&&v.show===0&&v.tur===0)
const soloTur  = Object.entries(byArt).filter(([,v])=>v.tur>0&&v.show===0&&v.tch===0)

console.log(`\n${"─".repeat(70)}`)
console.log("ALERTAS DEL NEGOCIO")
console.log("─".repeat(70))
console.log(`  ⚠ Baja rotación (≤3 unid/año):     ${bajaRot.length} artículos`)
console.log(`  ⚠ Solo Quilmes (no distribuido):    ${soloShow.length} artículos`)
console.log(`  ⚠ Solo Chascomús:                   ${soloTch.length} artículos`)
console.log(`  ⚠ Solo Mar del Plata:               ${soloTur.length} artículos`)

// Retornos / devoluciones (valores negativos)
const devs = rows.filter(r=>r.mTotal < 0)
const devTotal = devs.reduce((a,r)=>a+r.mTotal,0)
if(devs.length > 0){
  console.log(`  ⚠ Devoluciones detectadas:          ${devs.length} líneas  ${fmt(devTotal)}`)
}
