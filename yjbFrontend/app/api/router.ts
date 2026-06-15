import { authRouter } from "./auth-router";
import { categoryRouter } from "./category-router";
import { providerRouter } from "./provider-router";
import { serviceRouter } from "./service-router";
import { caseRouter } from "./case-router";
import { requirementRouter } from "./requirement-router";
import { orderRouter } from "./order-router";
import { dashboardRouter } from "./dashboard-router";
import { drewRouter } from "./drew-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  category: categoryRouter,
  provider: providerRouter,
  service: serviceRouter,
  case: caseRouter,
  requirement: requirementRouter,
  order: orderRouter,
  dashboard: dashboardRouter,
  drew: drewRouter,
});

export type AppRouter = typeof appRouter;
