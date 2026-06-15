import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { requirements, categories } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const requirementRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        id: requirements.id,
        title: requirements.title,
        description: requirements.description,
        budgetFrom: requirements.budgetFrom,
        budgetTo: requirements.budgetTo,
        deadline: requirements.deadline,
        status: requirements.status,
        createdAt: requirements.createdAt,
        categoryId: requirements.categoryId,
        categoryName: categories.name,
      })
      .from(requirements)
      .leftJoin(categories, eq(requirements.categoryId, categories.id))
      .orderBy(desc(requirements.createdAt));
  }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1),
        categoryId: z.number(),
        description: z.string().min(1),
        budgetFrom: z.number().optional(),
        budgetTo: z.number().optional(),
        deadline: z.string().optional(),
        contactPhone: z.string().optional(),
        contactWechat: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(requirements).values({
        userId: ctx.user.id,
        title: input.title,
        categoryId: input.categoryId,
        description: input.description,
        budgetFrom: input.budgetFrom ? String(input.budgetFrom) : null,
        budgetTo: input.budgetTo ? String(input.budgetTo) : null,
        deadline: input.deadline ?? null,
        contactPhone: input.contactPhone ?? null,
        contactWechat: input.contactWechat ?? null,
        status: "open",
      }).$returningId();
      return { id: result[0].id };
    }),

  myList: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        id: requirements.id,
        title: requirements.title,
        description: requirements.description,
        budgetFrom: requirements.budgetFrom,
        budgetTo: requirements.budgetTo,
        deadline: requirements.deadline,
        status: requirements.status,
        createdAt: requirements.createdAt,
        categoryName: categories.name,
      })
      .from(requirements)
      .leftJoin(categories, eq(requirements.categoryId, categories.id))
      .where(eq(requirements.userId, ctx.user.id))
      .orderBy(desc(requirements.createdAt));
  }),
});
