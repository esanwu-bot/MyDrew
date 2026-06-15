import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cases, providers } from "@db/schema";
import { eq, desc, like, and } from "drizzle-orm";
import { z } from "zod";

export const caseRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.category && input.category !== "all") {
        conditions.push(eq(cases.category, input.category));
      }
      if (input?.search) {
        conditions.push(like(cases.title, `%${input.search}%`));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: cases.id,
          title: cases.title,
          category: cases.category,
          clientName: cases.clientName,
          duration: cases.duration,
          budget: cases.budget,
          tags: cases.tags,
          challenge: cases.challenge,
          solution: cases.solution,
          results: cases.results,
          credentials: cases.credentials,
          image: cases.image,
          createdAt: cases.createdAt,
          providerId: cases.providerId,
          providerName: providers.companyName,
        })
        .from(cases)
        .leftJoin(providers, eq(cases.providerId, providers.id))
        .where(where)
        .orderBy(desc(cases.createdAt));

      return rows;
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: cases.id,
          title: cases.title,
          category: cases.category,
          clientName: cases.clientName,
          duration: cases.duration,
          budget: cases.budget,
          tags: cases.tags,
          challenge: cases.challenge,
          solution: cases.solution,
          results: cases.results,
          credentials: cases.credentials,
          image: cases.image,
          createdAt: cases.createdAt,
          providerId: cases.providerId,
          providerName: providers.companyName,
        })
        .from(cases)
        .leftJoin(providers, eq(cases.providerId, providers.id))
        .where(eq(cases.id, input.id));

      return rows[0] ?? null;
    }),
});
