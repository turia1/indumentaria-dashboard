import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "seller",
  "marketing",
  "accountant",
])

export const locationTypeEnum = pgEnum("location_type", ["physical", "online"])

export const saleSourceEnum = pgEnum("sale_source", [
  "zoologic",
  "tiendanube",
  "manual",
])

export const movementTypeEnum = pgEnum("movement_type", [
  "sale",
  "purchase",
  "adjustment",
  "transfer",
  "return",
])

export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "running",
  "completed",
  "failed",
])

export const alertSeverityEnum = pgEnum("alert_severity", [
  "info",
  "warning",
  "critical",
])

export const expenseTypeEnum = pgEnum("expense_type", ["fixed", "variable"])

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password"),
  role: userRoleEnum("role").notNull().default("seller"),
  locationId: text("location_id"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
})

// Auth.js tables
export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
})

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
})

// ─── LOCALES ──────────────────────────────────────────────────────────────────

export const locations = pgTable("locations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: locationTypeEnum("type").notNull().default("physical"),
  address: text("address"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─── PRODUCTOS ────────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  externalId: text("external_id"),        // ID en Zoologic o Tiendanube
  sku: text("sku"),
  name: text("name").notNull(),
  category: text("category"),
  brand: text("brand"),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("idx_products_external_id").on(t.externalId),
  index("idx_products_category").on(t.category),
])

export const productVariants = pgTable("product_variants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  size: text("size"),
  color: text("color"),
  barcode: text("barcode"),
  currentStock: integer("current_stock").notNull().default(0),
  minStockAlert: integer("min_stock_alert").notNull().default(3),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_variants_product_id").on(t.productId),
  index("idx_variants_barcode").on(t.barcode),
])

// ─── CLIENTES ─────────────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  externalId: text("external_id"),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  city: text("city"),
  province: text("province"),
  country: text("country").default("AR"),
  totalPurchases: integer("total_purchases").notNull().default(0),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).default("0"),
  firstPurchaseAt: timestamp("first_purchase_at"),
  lastPurchaseAt: timestamp("last_purchase_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_customers_email").on(t.email),
  index("idx_customers_external_id").on(t.externalId),
])

// ─── VENTAS ───────────────────────────────────────────────────────────────────

export const sales = pgTable("sales", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  externalId: text("external_id"),        // ID en Zoologic o Tiendanube
  source: saleSourceEnum("source").notNull(),
  locationId: text("location_id").references(() => locations.id),
  customerId: text("customer_id").references(() => customers.id),
  date: timestamp("date").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }),
  paymentMethod: text("payment_method"),
  status: text("status").default("completed"),
  notes: text("notes"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("idx_sales_external_source").on(t.externalId, t.source),
  index("idx_sales_date").on(t.date),
  index("idx_sales_location").on(t.locationId),
])

export const saleItems = pgTable("sale_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  saleId: text("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
  productVariantId: text("product_variant_id").references(() => productVariants.id),
  productName: text("product_name").notNull(), // snapshot del nombre
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
}, (t) => [
  index("idx_sale_items_sale_id").on(t.saleId),
])

// ─── MOVIMIENTOS DE STOCK ─────────────────────────────────────────────────────

export const inventoryMovements = pgTable("inventory_movements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  locationId: text("location_id").references(() => locations.id),
  productVariantId: text("product_variant_id").references(() => productVariants.id),
  type: movementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  referenceId: text("reference_id"),      // ID de venta, compra, etc.
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_movements_date").on(t.date),
  index("idx_movements_product").on(t.productVariantId),
])

// ─── GASTOS ───────────────────────────────────────────────────────────────────

export const expenseCategories = pgTable("expense_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: expenseTypeEnum("type").notNull().default("variable"),
  color: text("color").default("#6366f1"),
})

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  locationId: text("location_id").references(() => locations.id),
  categoryId: text("category_id").references(() => expenseCategories.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("ARS"),
  date: date("date").notNull(),
  description: text("description").notNull(),
  receiptUrl: text("receipt_url"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_expenses_date").on(t.date),
  index("idx_expenses_category").on(t.categoryId),
])

// ─── CAMPAÑAS PUBLICITARIAS ───────────────────────────────────────────────────

export const adCampaigns = pgTable("ad_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  platform: text("platform").notNull().default("meta"), // meta | google | tiktok
  externalId: text("external_id"),
  name: text("name").notNull(),
  status: text("status").default("active"),
  budgetDaily: numeric("budget_daily", { precision: 10, scale: 2 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const adCampaignMetrics = pgTable("ad_campaign_metrics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  campaignId: text("campaign_id").references(() => adCampaigns.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  spend: numeric("spend", { precision: 10, scale: 2 }).default("0"),
  conversions: integer("conversions").default(0),
  revenueAttributed: numeric("revenue_attributed", { precision: 12, scale: 2 }).default("0"),
  roas: numeric("roas", { precision: 6, scale: 2 }),
  cpa: numeric("cpa", { precision: 10, scale: 2 }),
  ctr: numeric("ctr", { precision: 6, scale: 4 }),
  cpm: numeric("cpm", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("idx_campaign_metrics_date").on(t.campaignId, t.date),
])

// ─── KPIs DIARIOS (tabla materializada para performance del dashboard) ────────

export const dailyKpis = pgTable("daily_kpis", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  locationId: text("location_id").references(() => locations.id),
  date: date("date").notNull(),
  totalSales: numeric("total_sales", { precision: 12, scale: 2 }).default("0"),
  transactionCount: integer("transaction_count").default(0),
  avgTicket: numeric("avg_ticket", { precision: 10, scale: 2 }).default("0"),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).default("0"),
  totalMargin: numeric("total_margin", { precision: 12, scale: 2 }).default("0"),
  marginPct: numeric("margin_pct", { precision: 6, scale: 2 }).default("0"),
  newCustomers: integer("new_customers").default(0),
  returningCustomers: integer("returning_customers").default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("idx_daily_kpis_location_date").on(t.locationId, t.date),
  index("idx_daily_kpis_date").on(t.date),
])

// ─── LOGS DE SINCRONIZACIÓN ───────────────────────────────────────────────────

export const syncJobs = pgTable("sync_jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: text("source").notNull(), // zoologic | tiendanube | meta_ads
  status: syncStatusEnum("status").notNull().default("pending"),
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  errors: text("errors"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─── ALERTAS ──────────────────────────────────────────────────────────────────

export const alerts = pgTable("alerts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(),           // low_stock | low_sales | high_expenses | etc.
  severity: alertSeverityEnum("severity").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),        // product | location | campaign
  entityId: text("entity_id"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_alerts_resolved").on(t.resolved),
  index("idx_alerts_created_at").on(t.createdAt),
])
