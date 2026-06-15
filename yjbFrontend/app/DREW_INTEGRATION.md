# DREW_INTEGRATION.md — 云匠邦 ↔ Drew 对接方案

## 1. 目标

将 yjbFrontend/app（云匠邦平台）与 Drew（MyDrew 智能体执行链路引擎）对接，实现：
- **服务商品化**：云匠邦的服务 → Drew 快照
- **需求标准化**：云匠邦的需求 → Drew 向量匹配
- **半自动交付**：订单 → Drew DAG 执行 → 验收报告
- **智能匹配**：需求文本 → Drew 语义搜索 → 推荐最优服务

## 2. 已有架构

### 云匠邦 (yjbFrontend/app)
- 前端：React 19 + Vite + Tailwind CSS + shadcn/ui
- API：tRPC (Hono) + Zod + Drizzle ORM
- 数据库：MySQL
- 已有表：users, categories, providers, services, cases, requirements, orders, reviews

### Drew (MyDrew)
- Python FastAPI (:8000) + Go Gin (:8080) + Qdrant + PostgreSQL + BGE-M3
- 核心模块：snapshot, matcher, executor, qa, expectation_model
- 已有示例：电商独立站、企业官网、小程序

## 3. 对接方案

### 3.1 新增 tRPC Router — `drew-router.ts`

在 `yjbFrontend/app/api/` 中新增 `drew-router.ts`，作为 Drew Python API 的 HTTP 代理。

所有前端对 Drew 的调用都通过 tRPC → drew-router → HTTP → Drew Python API。

### 3.2 数据映射

```
云匠邦 services        → Drew BusinessSnapshot
  id, title, summary,    snapshot_id, name, price,
  priceFrom, deliveryDays  tags, variables, steps, qa, metrics

云匠邦 providers         → Drew author
  companyName, rating,    author, verified status
  verified, completedOrders

云匠邦 requirements      → Drew demand_text
  title, description,      query (title + description)
  budgetFrom, budgetTo    budget

云匠邦 orders            → Drew ExecutionResult + QAReport
  id, status, amount      execution status, settlement
```

### 3.3 新增/改造页面

| 页面 | 路径 | 说明 |
|------|------|------|
| SmartMatch | `/smart-match` | 需求文本 → Drew 智能匹配 → 快照推荐 |
| DrewSnapshot | `/drew/:snapshotId` | 展示 Drew 快照详情（DAG、变量、QA） |
| RequirementsHall | `/requirements` | 浏览所有公开需求（服务商接单） |
| CaseDetail | `/case/:id` | 案例详情 + 相关服务推荐 |
| OrderDetail | `/order/:id` | 订单流程跟踪 + 验收 + 评价 |

### 3.4 新增 API 端点

```
tRPC:
  drew.search        → POST /api/v1/search
  drew.getSnapshot   → GET /api/v1/snapshots/:id
  drew.execute       → POST /api/v1/execute
  drew.qaRun         → POST /api/v1/qa/run
  drew.simulate      → POST /api/v1/simulate
  drew.stats         → GET /api/v1/stats

  service.publishToDrew    → 将服务发布为 Drew 快照
  requirement.matchWithDrew → 需求匹配 Drew 快照
```

## 4. 启动流程

```bash
# 1. 启动云匠邦数据库
make infra          # 如果 PostgreSQL 还未启动

# 2. 启动云匠邦 API
cd yjbFrontend/app && npm run dev
# 前端: http://localhost:5173
# tRPC: http://localhost:5173/api/trpc

# 3. 启动 Drew Go 搜索引擎
cd MyDrew && make server
# :8080

# 4. 启动 Drew Python 商业 API
cd MyDrew && make py-server
# :8000

# 5. 注册 Drew 示例快照
cd MyDrew && make py-seed
```

## 5. 下一步

- [ ] 将云匠邦现有 `services` 批量导入为 Drew 快照
- [ ] 实现服务发布时的自动快照生成
- [ ] 实现需求发布时的自动 Drew 匹配推荐
- [ ] 实现订单执行时的 DAG 跟踪
- [ ] 实现验收后的自动结算
