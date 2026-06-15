import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  decimal,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 服务分类
export const categories = mysqlTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 100 }),
  description: text("description"),
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// 服务商
export const providers = mysqlTable("providers", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  logo: text("logo"),
  description: text("description"),
  contactName: varchar("contact_name", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  location: varchar("location", { length: 255 }),
  verified: int("verified").default(0).notNull(), // 0=未认证, 1=已认证
  rating: decimal("rating", { precision: 2, scale: 1 }).default("5.0").notNull(),
  completedOrders: int("completed_orders").default(0).notNull(),
  responseTime: varchar("response_time", { length: 50 }).default("2h").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Provider = typeof providers.$inferSelect;

// 服务
export const services = mysqlTable("services", {
  id: serial("id").primaryKey(),
  providerId: bigint("provider_id", { mode: "number", unsigned: true }).notNull(),
  categoryId: bigint("category_id", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  summary: varchar("summary", { length: 500 }),
  description: text("description"),
  priceFrom: decimal("price_from", { precision: 12, scale: 2 }).notNull(),
  priceTo: decimal("price_to", { precision: 12, scale: 2 }),
  pricingUnit: varchar("pricing_unit", { length: 50 }).default("项目").notNull(), // 项目, 月, 次
  deliveryDays: int("delivery_days").default(7).notNull(),
  tags: text("tags"), // JSON array
  image: text("image"),
  featured: int("featured").default(0).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Service = typeof services.$inferSelect;

// 案例
export const cases = mysqlTable("cases", {
  id: serial("id").primaryKey(),
  serviceId: bigint("service_id", { mode: "number", unsigned: true }).notNull(),
  providerId: bigint("provider_id", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  clientName: varchar("client_name", { length: 255 }),
  duration: varchar("duration", { length: 100 }),
  budget: varchar("budget", { length: 100 }),
  tags: text("tags"), // JSON array
  challenge: text("challenge"),
  solution: text("solution"),
  results: text("results"), // JSON array
  credentials: text("credentials"), // JSON array
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Case = typeof cases.$inferSelect;

// 需求发布
export const requirements = mysqlTable("requirements", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  categoryId: bigint("category_id", { mode: "number", unsigned: true }).notNull(),
  description: text("description").notNull(),
  budgetFrom: decimal("budget_from", { precision: 12, scale: 2 }),
  budgetTo: decimal("budget_to", { precision: 12, scale: 2 }),
  deadline: varchar("deadline", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactWechat: varchar("contact_wechat", { length: 100 }),
  status: mysqlEnum("status", ["open", "in_progress", "completed", "closed"]).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Requirement = typeof requirements.$inferSelect;

// 订单
export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  serviceId: bigint("service_id", { mode: "number", unsigned: true }).notNull(),
  providerId: bigint("provider_id", { mode: "number", unsigned: true }).notNull(),
  requirementId: bigint("requirement_id", { mode: "number", unsigned: true }),
  title: varchar("title", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "in_progress", "delivered", "completed", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;

// 评价
export const reviews = mysqlTable("reviews", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  providerId: bigint("provider_id", { mode: "number", unsigned: true }).notNull(),
  rating: int("rating").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
