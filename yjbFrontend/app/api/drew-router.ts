import { createRouter, publicQuery, authedQuery } from "./middleware";
import { z } from "zod";

const DREW_API_URL = process.env.DREW_API_URL || "http://localhost:8000/api/v1";

async function drewFetch(path: string, options?: RequestInit) {
  const url = `${DREW_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drew API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const drewRouter = createRouter({
  // ── 快照搜索（智能匹配） ──
  search: publicQuery
    .input(
      z.object({
        query: z.string().min(1),
        budget: z.number().optional(),
        tags: z.array(z.string()).optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      return drewFetch("/search", {
        method: "POST",
        body: JSON.stringify(input),
      });
    }),

  // ── 获取快照详情 ──
  getSnapshot: publicQuery
    .input(z.object({ snapshotId: z.string() }))
    .query(async ({ input }) => {
      return drewFetch(`/snapshots/${input.snapshotId}`);
    }),

  // ── 执行快照 ──
  execute: authedQuery
    .input(
      z.object({
        snapshotId: z.string(),
        variables: z.record(z.any()).default({}),
      })
    )
    .mutation(async ({ input }) => {
      return drewFetch("/execute", {
        method: "POST",
        body: JSON.stringify(input),
      });
    }),

  // ── 运行 QA 验收 ──
  qaRun: authedQuery
    .input(z.object({ snapId: z.string(), orderId: z.string() }))
    .mutation(async ({ input }) => {
      return drewFetch(`/qa/run?snap_id=${input.snapId}&order_id=${input.orderId}`);
    }),

  // ── 确认 QA 检查项 ──
  qaConfirm: authedQuery
    .input(
      z.object({
        orderId: z.string(),
        checkId: z.string(),
        passed: z.boolean(),
        detail: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return drewFetch("/qa/confirm", {
        method: "POST",
        body: JSON.stringify(input),
      });
    }),

  // ── 仲裁升级 ──
  arbitration: authedQuery
    .input(z.object({ orderId: z.string(), reason: z.string() }))
    .mutation(async ({ input }) => {
      return drewFetch("/qa/arbitration", {
        method: "POST",
        body: JSON.stringify(input),
      });
    }),

  // ── 收入模拟 ──
  simulate: publicQuery
    .input(
      z.object({
        nProjects: z.number().default(100),
        avgProjectValue: z.number().default(5000),
        rReuse: z.number().default(0.3),
        sEnterprise: z.number().default(10),
        sFreelancer: z.number().default(50),
        nArbitration: z.number().default(5),
      }).optional()
    )
    .query(async ({ input }) => {
      return drewFetch("/simulate", {
        method: "POST",
        body: JSON.stringify(input || {}),
      });
    }),

  // ── 平台统计 ──
  stats: publicQuery.query(async () => {
    return drewFetch("/stats");
  }),
});
