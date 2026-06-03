import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
config({ path: ".env.local" })
const sql = neon(process.env.DATABASE_URL)

await sql`UPDATE locations SET name='Showroom Quilmes',  address='Quilmes, Buenos Aires'       WHERE id='loc_1'`
await sql`UPDATE locations SET name='Chascomús',         address='Chascomús, Buenos Aires'      WHERE id='loc_2'`
await sql`UPDATE locations SET name='Mar del Plata',     address='Mar del Plata, Buenos Aires'  WHERE id='loc_3'`
await sql`UPDATE locations SET name='Tienda Online',     address=null WHERE id='loc_online'`

const locs = await sql`SELECT id, name, type FROM locations ORDER BY name`
console.log("Locales actualizados:")
locs.forEach(l => console.log(`  ${l.id} → ${l.name} (${l.type})`))
