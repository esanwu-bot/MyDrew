import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { categories } from "@db/schema";
import { eq } from "drizzle-orm";

export const categoryRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(categories).orderBy(categories.sortOrder);
  }),

  bySlug: publicQuery
    .input((val: unknown) => {
      if (typeof val !== "string") throw new Error("Invalid input");
      return val;
    })
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(categories).where(eq(categories.slug, input));
      return rows[0] ?? null;
    }),
});
