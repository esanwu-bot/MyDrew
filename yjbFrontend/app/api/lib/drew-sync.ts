import { getDb } from "./queries/connection";
import { services, providers, categories } from "@db/schema";
import { eq, desc } from "drizzle-orm";

const DREW_API_URL = process.env.DREW_API_URL || "http://localhost:8000/api/v1";

/**
 * 将云匠邦服务同步为 Drew 快照
 * 用法：在 tRPC mutation 或后台任务中调用
 */
export async function syncServiceToDrewSnapshot(serviceId: number) {
  const db = getDb();

  // 1. 获取服务详情
  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, serviceId));

  if (!service) throw new Error(`Service ${serviceId} not found`);

  // 2. 获取服务商信息
  const [provider] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, service.providerId));

  // 3. 获取分类
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, service.categoryId));

  // 4. 构造 Drew 快照
  const tags = service.tags ? JSON.parse(service.tags as string) : [];
  const categoryTag = category?.name ? [category.name] : [];
  const allTags = [...new Set([...categoryTag, ...tags])];

  const snapshot = {
    snapshot_id: `yjb-service-${service.id}`,
    name: service.title,
    version: "1.0.0",
    author: provider?.companyName || "未知服务商",
    price: Number(service.priceFrom),
    tags: allTags,
    variables: [
      {
        name: "delivery_days",
        type: "number",
        default: service.deliveryDays,
      },
      {
        name: "pricing_unit",
        type: "string",
        default: service.pricingUnit,
      },
    ],
    steps: [
      {
        id: 1,
        name: "需求确认",
        tool: "human",
        auto: false,
        estimated_hours: 2,
      },
      {
        id: 2,
        name: "项目执行",
        tool: "human",
        auto: false,
        estimated_hours: service.deliveryDays * 8,
      },
      {
        id: 3,
        name: "交付验收",
        tool: "human",
        auto: false,
        estimated_hours: 2,
      },
    ],
    qa: [
      { check: "功能完整性检查", method: "manual" },
      { check: "客户满意度确认", method: "manual" },
    ],
    metrics: {
      reuse_count: 0,
      avg_delivery_days: service.deliveryDays,
      satisfaction: Number(provider?.rating || 5) / 5,
      refund_rate: 0,
    },
  };

  // 5. 调用 Drew API 注册
  const res = await fetch(`${DREW_API_URL}/snapshots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drew sync failed: ${text}`);
  }

  const result = await res.json();
  return {
    serviceId: service.id,
    drewSnapshotId: result.snapshot_id,
    drewCid: result.cid,
  };
}

/**
 * 批量同步所有服务到 Drew
 */
export async function syncAllServicesToDrew() {
  const db = getDb();
  const allServices = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.status, "active"));

  const results = [];
  for (const svc of allServices) {
    try {
      const result = await syncServiceToDrewSnapshot(svc.id);
      results.push({ success: true, ...result });
    } catch (e) {
      results.push({ success: false, serviceId: svc.id, error: (e as Error).message });
    }
  }
  return results;
}

/**
 * 将需求文本发送给 Drew 匹配
 */
export async function matchRequirementWithDrew(
  requirementId: number
) {
  const db = getDb();
  const { requirements } = await import("@db/schema");

  const [req] = await db
    .select()
    .from(requirements)
    .where(eq(requirements.id, requirementId));

  if (!req) throw new Error(`Requirement ${requirementId} not found`);

  const query = `${req.title} ${req.description}`;

  const res = await fetch(`${DREW_API_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      budget: req.budgetTo ? Number(req.budgetTo) : undefined,
      limit: 5,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drew match failed: ${text}`);
  }

  return await res.json();
}
