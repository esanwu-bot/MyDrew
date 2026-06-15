import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { services, providers, cases, orders } from "@db/schema";
import { sql, eq } from "drizzle-orm";

export const dashboardRouter = createRouter({
  stats: publicQuery.query(async () => {
    const db = getDb();

    const [serviceCount] = await db.select({ count: sql<number>`count(*)` }).from(services).where(eq(services.status, "active"));
    const [providerCount] = await db.select({ count: sql<number>`count(*)` }).from(providers).where(eq(providers.verified, 1));
    const [caseCount] = await db.select({ count: sql<number>`count(*)` }).from(cases);
    const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);

    const totalRevenue = await db.select({ total: sql<string>`COALESCE(SUM(${orders.amount}), 0)` }).from(orders).where(eq(orders.status, "completed"));

    return {
      serviceCount: serviceCount?.count ?? 0,
      providerCount: providerCount?.count ?? 0,
      caseCount: caseCount?.count ?? 0,
      orderCount: orderCount?.count ?? 0,
      totalRevenue: Number(totalRevenue[0]?.total ?? 0),
    };
  }),
});
