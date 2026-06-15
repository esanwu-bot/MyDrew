import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { services, providers, categories } from "@db/schema";
import { eq, desc, and, like } from "drizzle-orm";
import { z } from "zod";

export const serviceRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        categoryId: z.number().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.categoryId) {
        conditions.push(eq(services.categoryId, input.categoryId));
      }
      if (input?.featured) {
        conditions.push(eq(services.featured, 1));
      }
      if (input?.search) {
        conditions.push(like(services.title, `%${input.search}%`));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: services.id,
          title: services.title,
          slug: services.slug,
          summary: services.summary,
          priceFrom: services.priceFrom,
          priceTo: services.priceTo,
          pricingUnit: services.pricingUnit,
          deliveryDays: services.deliveryDays,
          tags: services.tags,
          featured: services.featured,
          status: services.status,
          createdAt: services.createdAt,
          providerId: services.providerId,
          categoryId: services.categoryId,
          categoryName: categories.name,
          providerName: providers.companyName,
          providerRating: providers.rating,
          providerVerified: providers.verified,
        })
        .from(services)
        .leftJoin(providers, eq(services.providerId, providers.id))
        .leftJoin(categories, eq(services.categoryId, categories.id))
        .where(where)
        .orderBy(desc(services.createdAt));

      return rows;
    }),

  bySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: services.id,
          title: services.title,
          slug: services.slug,
          summary: services.summary,
          description: services.description,
          priceFrom: services.priceFrom,
          priceTo: services.priceTo,
          pricingUnit: services.pricingUnit,
          deliveryDays: services.deliveryDays,
          tags: services.tags,
          featured: services.featured,
          status: services.status,
          createdAt: services.createdAt,
          providerId: services.providerId,
          categoryId: services.categoryId,
          categoryName: categories.name,
          providerName: providers.companyName,
          providerRating: providers.rating,
          providerVerified: providers.verified,
          providerDescription: providers.description,
          providerCompletedOrders: providers.completedOrders,
          providerResponseTime: providers.responseTime,
        })
        .from(services)
        .leftJoin(providers, eq(services.providerId, providers.id))
        .leftJoin(categories, eq(services.categoryId, categories.id))
        .where(eq(services.slug, input.slug));

      return rows[0] ?? null;
    }),

  byProvider: publicQuery
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(services)
        .where(eq(services.providerId, input.providerId));
    }),
});
