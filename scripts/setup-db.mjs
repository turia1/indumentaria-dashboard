import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL)

async function run(label, query) {
  try {
    await sql.query(query)
    console.log(`  ✓ ${label}`)
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log(`  ~ ${label} (ya existe)`)
    } else {
      console.error(`  ✗ ${label}: ${err.message}`)
    }
  }
}

async function setup() {
  console.log("\nConectando a Neon y creando schema...\n")

  // ENUMS
  await run("enum alert_severity",  `CREATE TYPE "alert_severity" AS ENUM('info', 'warning', 'critical')`)
  await run("enum expense_type",    `CREATE TYPE "expense_type" AS ENUM('fixed', 'variable')`)
  await run("enum location_type",   `CREATE TYPE "location_type" AS ENUM('physical', 'online')`)
  await run("enum movement_type",   `CREATE TYPE "movement_type" AS ENUM('sale', 'purchase', 'adjustment', 'transfer', 'return')`)
  await run("enum sale_source",     `CREATE TYPE "sale_source" AS ENUM('zoologic', 'tiendanube', 'manual')`)
  await run("enum sync_status",     `CREATE TYPE "sync_status" AS ENUM('pending', 'running', 'completed', 'failed')`)
  await run("enum user_role",       `CREATE TYPE "user_role" AS ENUM('admin', 'manager', 'seller', 'marketing', 'accountant')`)

  // TABLAS BASE
  await run("tabla users", `
    CREATE TABLE IF NOT EXISTS "users" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL UNIQUE,
      "name" text NOT NULL,
      "password" text,
      "role" user_role DEFAULT 'seller' NOT NULL,
      "location_id" text,
      "active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "last_login_at" timestamp
    )`)

  await run("tabla sessions", `
    CREATE TABLE IF NOT EXISTS "sessions" (
      "session_token" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "expires" timestamp NOT NULL
    )`)

  await run("tabla verification_tokens", `
    CREATE TABLE IF NOT EXISTS "verification_tokens" (
      "identifier" text NOT NULL,
      "token" text NOT NULL,
      "expires" timestamp NOT NULL
    )`)

  await run("tabla locations", `
    CREATE TABLE IF NOT EXISTS "locations" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "type" location_type DEFAULT 'physical' NOT NULL,
      "address" text,
      "phone" text,
      "active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla expense_categories", `
    CREATE TABLE IF NOT EXISTS "expense_categories" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "type" expense_type DEFAULT 'variable' NOT NULL,
      "color" text DEFAULT '#6366f1'
    )`)

  await run("tabla products", `
    CREATE TABLE IF NOT EXISTS "products" (
      "id" text PRIMARY KEY NOT NULL,
      "external_id" text,
      "sku" text,
      "name" text NOT NULL,
      "category" text,
      "brand" text,
      "cost_price" numeric(12, 2),
      "active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla product_variants", `
    CREATE TABLE IF NOT EXISTS "product_variants" (
      "id" text PRIMARY KEY NOT NULL,
      "product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
      "size" text,
      "color" text,
      "barcode" text,
      "current_stock" integer DEFAULT 0 NOT NULL,
      "min_stock_alert" integer DEFAULT 3 NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla customers", `
    CREATE TABLE IF NOT EXISTS "customers" (
      "id" text PRIMARY KEY NOT NULL,
      "external_id" text,
      "name" text,
      "email" text,
      "phone" text,
      "city" text,
      "province" text,
      "country" text DEFAULT 'AR',
      "total_purchases" integer DEFAULT 0 NOT NULL,
      "total_spent" numeric(12, 2) DEFAULT '0',
      "first_purchase_at" timestamp,
      "last_purchase_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla sales", `
    CREATE TABLE IF NOT EXISTS "sales" (
      "id" text PRIMARY KEY NOT NULL,
      "external_id" text,
      "source" sale_source NOT NULL,
      "location_id" text REFERENCES "locations"("id"),
      "customer_id" text REFERENCES "customers"("id"),
      "date" timestamp NOT NULL,
      "subtotal" numeric(12, 2) NOT NULL,
      "discount" numeric(12, 2) DEFAULT '0',
      "total" numeric(12, 2) NOT NULL,
      "total_cost" numeric(12, 2),
      "payment_method" text,
      "status" text DEFAULT 'completed',
      "notes" text,
      "synced_at" timestamp DEFAULT now() NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla sale_items", `
    CREATE TABLE IF NOT EXISTS "sale_items" (
      "id" text PRIMARY KEY NOT NULL,
      "sale_id" text NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
      "product_variant_id" text REFERENCES "product_variants"("id"),
      "product_name" text NOT NULL,
      "quantity" integer NOT NULL,
      "unit_price" numeric(12, 2) NOT NULL,
      "unit_cost" numeric(12, 2),
      "subtotal" numeric(12, 2) NOT NULL
    )`)

  await run("tabla inventory_movements", `
    CREATE TABLE IF NOT EXISTS "inventory_movements" (
      "id" text PRIMARY KEY NOT NULL,
      "location_id" text REFERENCES "locations"("id"),
      "product_variant_id" text REFERENCES "product_variants"("id"),
      "type" movement_type NOT NULL,
      "quantity" integer NOT NULL,
      "reference_id" text,
      "date" timestamp NOT NULL,
      "notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla expenses", `
    CREATE TABLE IF NOT EXISTS "expenses" (
      "id" text PRIMARY KEY NOT NULL,
      "location_id" text REFERENCES "locations"("id"),
      "category_id" text REFERENCES "expense_categories"("id"),
      "amount" numeric(12, 2) NOT NULL,
      "currency" text DEFAULT 'ARS' NOT NULL,
      "date" date NOT NULL,
      "description" text NOT NULL,
      "receipt_url" text,
      "created_by" text REFERENCES "users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla ad_campaigns", `
    CREATE TABLE IF NOT EXISTS "ad_campaigns" (
      "id" text PRIMARY KEY NOT NULL,
      "platform" text DEFAULT 'meta' NOT NULL,
      "external_id" text,
      "name" text NOT NULL,
      "status" text DEFAULT 'active',
      "budget_daily" numeric(10, 2),
      "start_date" date,
      "end_date" date,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla ad_campaign_metrics", `
    CREATE TABLE IF NOT EXISTS "ad_campaign_metrics" (
      "id" text PRIMARY KEY NOT NULL,
      "campaign_id" text REFERENCES "ad_campaigns"("id") ON DELETE CASCADE,
      "date" date NOT NULL,
      "impressions" integer DEFAULT 0,
      "clicks" integer DEFAULT 0,
      "spend" numeric(10, 2) DEFAULT '0',
      "conversions" integer DEFAULT 0,
      "revenue_attributed" numeric(12, 2) DEFAULT '0',
      "roas" numeric(6, 2),
      "cpa" numeric(10, 2),
      "ctr" numeric(6, 4),
      "cpm" numeric(10, 2),
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla daily_kpis", `
    CREATE TABLE IF NOT EXISTS "daily_kpis" (
      "id" text PRIMARY KEY NOT NULL,
      "location_id" text REFERENCES "locations"("id"),
      "date" date NOT NULL,
      "total_sales" numeric(12, 2) DEFAULT '0',
      "transaction_count" integer DEFAULT 0,
      "avg_ticket" numeric(10, 2) DEFAULT '0',
      "total_cost" numeric(12, 2) DEFAULT '0',
      "total_margin" numeric(12, 2) DEFAULT '0',
      "margin_pct" numeric(6, 2) DEFAULT '0',
      "new_customers" integer DEFAULT 0,
      "returning_customers" integer DEFAULT 0,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla sync_jobs", `
    CREATE TABLE IF NOT EXISTS "sync_jobs" (
      "id" text PRIMARY KEY NOT NULL,
      "source" text NOT NULL,
      "status" sync_status DEFAULT 'pending' NOT NULL,
      "records_processed" integer DEFAULT 0,
      "records_created" integer DEFAULT 0,
      "records_updated" integer DEFAULT 0,
      "errors" text,
      "started_at" timestamp,
      "completed_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  await run("tabla alerts", `
    CREATE TABLE IF NOT EXISTS "alerts" (
      "id" text PRIMARY KEY NOT NULL,
      "type" text NOT NULL,
      "severity" alert_severity DEFAULT 'info' NOT NULL,
      "title" text NOT NULL,
      "message" text NOT NULL,
      "entity_type" text,
      "entity_id" text,
      "resolved" boolean DEFAULT false NOT NULL,
      "resolved_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`)

  // INDICES
  await run("index sales date",         `CREATE INDEX IF NOT EXISTS "idx_sales_date" ON "sales" ("date")`)
  await run("index sales location",     `CREATE INDEX IF NOT EXISTS "idx_sales_location" ON "sales" ("location_id")`)
  await run("index products external",  `CREATE INDEX IF NOT EXISTS "idx_products_external_id" ON "products" ("external_id")`)
  await run("index products category",  `CREATE INDEX IF NOT EXISTS "idx_products_category" ON "products" ("category")`)
  await run("index variants product",   `CREATE INDEX IF NOT EXISTS "idx_variants_product_id" ON "product_variants" ("product_id")`)
  await run("index variants barcode",   `CREATE INDEX IF NOT EXISTS "idx_variants_barcode" ON "product_variants" ("barcode")`)
  await run("index customers email",    `CREATE INDEX IF NOT EXISTS "idx_customers_email" ON "customers" ("email")`)
  await run("index sale_items sale",    `CREATE INDEX IF NOT EXISTS "idx_sale_items_sale_id" ON "sale_items" ("sale_id")`)
  await run("index movements date",     `CREATE INDEX IF NOT EXISTS "idx_movements_date" ON "inventory_movements" ("date")`)
  await run("index expenses date",      `CREATE INDEX IF NOT EXISTS "idx_expenses_date" ON "expenses" ("date")`)
  await run("index daily_kpis date",    `CREATE INDEX IF NOT EXISTS "idx_daily_kpis_date" ON "daily_kpis" ("date")`)
  await run("index alerts resolved",    `CREATE INDEX IF NOT EXISTS "idx_alerts_resolved" ON "alerts" ("resolved")`)

  // DATOS INICIALES
  await run("local 1",        `INSERT INTO "locations" ("id","name","type") VALUES ('loc_1','Local 1','physical') ON CONFLICT DO NOTHING`)
  await run("local 2",        `INSERT INTO "locations" ("id","name","type") VALUES ('loc_2','Local 2','physical') ON CONFLICT DO NOTHING`)
  await run("local 3",        `INSERT INTO "locations" ("id","name","type") VALUES ('loc_3','Local 3','physical') ON CONFLICT DO NOTHING`)
  await run("tienda online",  `INSERT INTO "locations" ("id","name","type") VALUES ('loc_online','Tienda Online','online') ON CONFLICT DO NOTHING`)

  await run("cat alquiler",   `INSERT INTO "expense_categories" ("id","name","type","color") VALUES ('cat_alquiler','Alquiler','fixed','#6366f1') ON CONFLICT DO NOTHING`)
  await run("cat sueldos",    `INSERT INTO "expense_categories" ("id","name","type","color") VALUES ('cat_sueldos','Sueldos','fixed','#8b5cf6') ON CONFLICT DO NOTHING`)
  await run("cat servicios",  `INSERT INTO "expense_categories" ("id","name","type","color") VALUES ('cat_servicios','Servicios','fixed','#06b6d4') ON CONFLICT DO NOTHING`)
  await run("cat marketing",  `INSERT INTO "expense_categories" ("id","name","type","color") VALUES ('cat_marketing','Marketing','variable','#f59e0b') ON CONFLICT DO NOTHING`)
  await run("cat proveedores",`INSERT INTO "expense_categories" ("id","name","type","color") VALUES ('cat_proveedores','Proveedores','variable','#10b981') ON CONFLICT DO NOTHING`)
  await run("cat impuestos",  `INSERT INTO "expense_categories" ("id","name","type","color") VALUES ('cat_impuestos','Impuestos','fixed','#ef4444') ON CONFLICT DO NOTHING`)
  await run("cat logistica",  `INSERT INTO "expense_categories" ("id","name","type","color") VALUES ('cat_logistica','Logistica','variable','#f97316') ON CONFLICT DO NOTHING`)
  await run("cat otros",      `INSERT INTO "expense_categories" ("id","name","type","color") VALUES ('cat_otros','Otros','variable','#6b7280') ON CONFLICT DO NOTHING`)

  // Verificar resultado final
  const { rows } = await sql.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `)

  console.log(`\n${rows.length} tablas en Neon:`)
  rows.forEach(r => console.log(`  - ${r.table_name}`))
  console.log("\nBase de datos lista!\n")
}

setup()
