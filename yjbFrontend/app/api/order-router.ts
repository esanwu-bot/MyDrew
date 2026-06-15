import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, services, providers } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const orderRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        title: orders.title,
        amount: orders.amount,
        status: orders.status,
        notes: orders.notes,
        createdAt: orders.createdAt,
        serviceId: orders.serviceId,
        providerId: orders.providerId,
        providerName: providers.companyName,
        serviceTitle: services.title,
      })
      .from(orders)
      .leftJoin(providers, eq(orders.providerId, providers.id))
      .leftJoin(services, eq(orders.serviceId, services.id))
      .where(eq(orders.userId, ctx.user.id))
      .orderBy(desc(orders.createdAt));
  }),

  create: authedQuery
    .input(
      z.object({
        serviceId: z.number(),
        providerId: z.number(),
        title: z.string().min(1),
        amount: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const orderNo = `ORD${Date.now()}`;
      const result = await db.insert(orders).values({
        orderNo,
        userId: ctx.user.id,
        serviceId: input.serviceId,
        providerId: input.providerId,
        title: input.title,
        amount: String(input.amount),
        status: "pending",
        notes: input.notes ?? null,
      }).$returningId();
      return { id: result[0].id, orderNo };
    }),

  updateStatus: authedQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "paid", "in_progress", "delivered", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(orders)
        .set({ status: input.status })
        .where(eq(orders.id, input.id));
      return { success: true };
    }),
});
