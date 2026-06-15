import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { providers } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const providerRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(providers).orderBy(desc(providers.rating));
  }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db.select().from(providers).where(eq(providers.id, input.id));
      return rows[0] ?? null;
    }),
});
