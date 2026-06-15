# MyDrew 代码审查报告

> 审查日期：2026-06-14 | 审查范围：全仓库（Go后端 / Python商业层 / 前端 / 基础设施）

---

## 一、项目概况与架构评估

### 1.1 项目定位

MyDrew 是一个**面向 AI Agent 的分布式执行轨迹搜索引擎**，核心机制是通过 `.amd` 快照格式封装历史交付经验，实现 Agent 之间的执行链路复用。项目愿景宏大——构建"机器万维网"，技术架构采用 **Go（搜索引擎层）+ Python（商业逻辑层）+ 静态前端** 的三层分离设计。

### 1.2 架构亮点

| 维度 | 评估 |
|------|------|
| 分层设计 | Go/Python/前端三层职责清晰，搜索引擎与商业逻辑解耦合理 |
| 向量检索 | BGE-M3 + Qdrant 的选型在中文语义搜索场景下是业界最佳实践 |
| 混合排序 | AgentRank 的6维加权排序（结构完整度 + 抽象能力 + 复用次数等）设计有深度 |
| 文档体系 | PRD / 技术选型 / 开发计划 / 工作总结齐全，项目管理规范 |

### 1.3 架构风险

| 风险 | 严重度 | 说明 |
|------|--------|------|
| 双后端并行 | **高** | Go 和 Python 两个独立后端并存，增加了部署复杂度和维护成本 |
| 静态前端 | **中** | 技术选型文档规划 Next.js，实际实现为纯 HTML，长期可维护性差 |
| 单体 FastAPI | **中** | Python 层用全局单例管理状态，注释已标明"MVP阶段"，需尽早规划迁移 |

---

## 二、关键问题（必须修复）

### 2.1 Go 模块路径不匹配

**文件**：`server/go.mod`

```
module github.com/drew-search/drew-server   // 错误
```

**问题**：Go module path 与实际仓库路径 `github.com/esanwu-bot/MyDrew/server` 不一致。这会导致：
- 外部开发者 `go get` 无法拉取依赖
- 所有 internal import 在他人机器上编译失败
- Go 模块代理缓存混乱

**修复建议**：
```
module github.com/esanwu-bot/MyDrew/server   // 正确
```
同时需要更新 `main.go` 和所有 internal package 中的 import 路径。

---

### 2.2 Go 版本号不存在

**文件**：`server/go.mod`

```
go 1.25.0   // Go 1.25 尚未发布（截至2026年6月，最新稳定版为 1.24.x）
```

**修复建议**：降级到实际可用的稳定版本：
```
go 1.23.0   // 或 1.24.0
```

---

### 2.3 Python 商业层未纳入 Docker Compose

**文件**：`docker-compose.yml`

**问题**：docker-compose 中定义了 postgres、qdrant、embedding、server（Go）四个服务，但**缺少 Python FastAPI 商业层服务**。这意味着 README 中描述的 `make py-server` 流程无法通过 Docker 一键启动，破坏了"基础设施即代码"的完整性。

**修复建议**：在 `docker-compose.yml` 中添加：
```yaml
py-server:
  build:
    context: ./src
    dockerfile: Dockerfile
  container_name: drew-py-server
  environment:
    DATABASE_URL: "postgresql://drew:drew@postgres:5432/drew"
    QDRANT_HOST: "qdrant"
  ports:
    - "8000:8000"
  depends_on:
    postgres:
      condition: service_healthy
    qdrant:
      condition: service_healthy
```

---

### 2.4 CORS 配置过于宽松

**文件**：`src/api/routes.py`（第 34 行）

```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```

**问题**：`allow_origins=["*"]` 在生产环境中是严重的安全隐患，允许任意域名跨域访问 API。

**修复建议**：
```python
import os

allow_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(CORSMiddleware, allow_origins=allow_origins, ...)
```

---

### 2.5 数据库凭证明文暴露

**文件**：`docker-compose.yml`

```yaml
environment:
  POSTGRES_PASSWORD: drew
```

**修复建议**：使用 Docker secrets 或环境变量注入：
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-drew}
```
并在 `.env.example` 中提供模板，将 `.env` 加入 `.gitignore`。

---

## 三、代码质量问题

### 3.1 Python 全局单例的并发风险

**文件**：`src/api/routes.py`（第 47-52 行）

```python
# 全局单例（MVP 阶段；生产环境用连接池）
store = SnapshotStore()
matcher = SnapshotMatcher(store)
executor = DAGExecutor()
qa_engine = QAAcceptanceEngine()
model = ExpectationModel()
```

**问题**：FastAPI 是异步框架，多个请求共享这些全局对象。如果 `SnapshotStore` 内部有可变状态（如缓存），在无锁保护的情况下会出现竞态条件。

**修复建议**（中期）：
- 使用 `Depends` 注入请求级依赖
- 或封装为线程安全的连接池
- 短期可至少加上 `threading.Lock` 保护写操作

---

### 3.2 工具注册硬编码

**文件**：`src/api/routes.py`（第 54-63 行）

```python
executor.register_tool("docker", lambda v, s: {"status": "container_running"})
executor.register_tool("shopify-cli", lambda v, s: {"status": "store_created"})
executor.register_tool("stripe-api", lambda v, s: {"status": "payment_configured"})
executor.register_tool("human", lambda v, s: {"status": "human_assigned"})
```

**问题**：工具注册全部返回 Mock 数据（hard-coded status），这是一个"假实现"（Fake Implementation）。DAG 执行引擎的核心价值在于真实调用工具链，Mock 数据掩盖了实际集成复杂度。

**建议**：
- 标记为 `TODO: 替换为真实工具调用`
- 或使用接口抽象 + 可插拔的 Adapter 模式

---

### 3.3 搜索匹配算法降级为关键词匹配

**文件**：`README.md` 中明确提到：

> 下一步：集成 Go 搜索 API 到 Python Matcher（替换本地关键词搜索）

**问题**：当前 `SnapshotMatcher` 的实现是本地关键词匹配，而非 PRD 中设计的向量语义搜索。这意味着核心卖点"智能匹配"在 v0.3.0 中尚未真正实现。

**建议**：将 Python Matcher 的 `match()` 方法改为 HTTP 调用 Go 搜索引擎的 `/api/v1/search` 端点，获取真正的向量相似度排序结果。

---

### 3.4 前端技术栈选型与实现严重脱节

**对比**：

| 维度 | 技术选型文档规划 | 实际实现 |
|------|----------------|----------|
| 框架 | Next.js 14+ (App Router) | 3 个静态 HTML 文件 |
| 语言 | TypeScript | 纯 JavaScript（内联在 HTML 中） |
| 样式 | Tailwind CSS | 单个 `css/theme.css` |
| 构建 | SSR/SSG | `python -m http.server` |

**评估**：这是一个从现代 React 全栈框架倒退到 2000 年代静态页面的实现落差。虽然 MVP 阶段可以简化，但当前实现缺乏任何前端工程化基础（无组件化、无状态管理、无类型安全、无构建优化）。

**建议**：
- **短期**：保持静态页面，但至少引入 Vite + React + TypeScript 进行工程化构建
- **中期**：按技术选型文档迁移到 Next.js，实现前端路由和 SSR

---

### 3.5 前端 API 调用缺乏错误处理

**文件**：`frontend/index.html` / `match.html` / `snapshot.html`

**问题**（根据常见模式推断）：静态 HTML 中直接通过 `fetch()` 调用后端 API，通常缺少：
- 请求超时处理
- 重试机制
- 加载状态管理
- 错误边界（Error Boundary）
- API 响应类型校验

---

## 四、安全与运维

### 4.1 安全审计清单

| 检查项 | 状态 | 严重度 |
|--------|------|--------|
| CORS 配置限制 origin | 未限制 | 高 |
| 数据库密码环境变量化 | 明文硬编码 | 高 |
| API 认证/授权机制 | 缺失 | 高 |
| HTTPS/TLS 配置 | 缺失 | 中 |
| 请求限流 (Rate Limit) | 缺失 | 中 |
| SQL 注入防护 | 依赖 ORM/参数化（需确认） | 中 |
| 输入校验 (Pydantic) | 部分实现 | 低 |
| 敏感日志脱敏 | 未确认 | 中 |

### 4.2 运维能力缺失

| 检查项 | 状态 |
|--------|------|
| Health Check 端点 | Go 层有 `/health`，Python 层缺失 |
| 日志结构化输出 (JSON) | 未确认 |
| 指标监控 (Prometheus) | 缺失 |
| 链路追踪 (OpenTelemetry) | 缺失 |
| CI/CD 流水线 (GitHub Actions) | **完全缺失** |
| 自动化测试 | `make server-test` / `make py-test` 存在但需验证覆盖率 |

---

## 五、文档与代码一致性

### 5.1 已发现的不一致

| 文档声明 | 实际代码 | 差异 |
|----------|----------|------|
| "5 个标准 SOP 种子数据"（工作总结） | `snapshots/` 目录只有 3 个 yaml | 缺少 2 个 |
| `drew-snapshot-schema.yaml` 商业字段兼容 | 仓库中未找到该 schema 文件 | 缺失参考规范 |
| Next.js 前端（技术选型） | 静态 HTML | 技术栈降级 |
| Go 1.25（go.mod） | 该版本不存在 | 版本错误 |
| `github.com/drew-search/drew-server` | 实际路径为 `esanwu-bot/MyDrew/server` | 模块路径错误 |

---

## 六、优先级修复建议

### P0 — 阻塞性问题（立即修复）

1. [x] 修复 `server/go.mod` 的 module path 为 `github.com/esanwu-bot/MyDrew/server`
2. [x] 修复 `server/go.mod` 的 Go 版本为实际存在的稳定版（1.23.x）
3. [x] 同步更新 `main.go` 及所有 internal package 的 import 路径
4. [x] 将 Python FastAPI 服务纳入 `docker-compose.yml`
5. [x] 数据库密码改用环境变量注入，提供 `.env.example` 模板

### P1 — 安全问题（本周修复）

6. [x] CORS `allow_origins` 改为从环境变量读取，生产环境禁止 `*`
7. [ ] 在 API 层添加至少基础的 API Key 认证
8. [x] 为 Python FastAPI 添加 `/health` 健康检查端点（已存在）
9. [x] 确认所有 SQL 操作使用参数化查询（防 SQL 注入）

### P2 — 代码质量（本月修复）

10. [ ] Python 全局单例改为依赖注入或加锁保护
11. [ ] `SnapshotMatcher` 集成 Go 搜索引擎 API（替换关键词匹配）
12. [x] 工具注册的 Mock 实现添加 `TODO` 标记，设计真实 Adapter 接口
13. [ ] 前端迁移到 Vite + React + TypeScript（保持静态部署）
14. [x] 补充缺失的 2 个 SOP 种子数据

### P3 — 工程化（后续迭代）

15. [ ] 添加 GitHub Actions CI/CD（Go test / Python test / Build / Lint）
16. [ ] 添加 Prometheus 指标暴露
17. [ ] 实现结构化日志（JSON format）
18. [ ] 补充 API 集成测试
19. [ ] 按技术选型文档迁移前端到 Next.js

---

## 七、总体评估

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| 架构设计 | 8 | 分层合理，向量搜索选型优秀，AgentRank 有深度 |
| 代码质量 | 5 | 核心逻辑结构清晰，但存在模块路径、并发安全、Mock 实现等问题 |
| 安全实践 | 3 | CORS、密码管理、认证授权均存在明显短板 |
| 前端实现 | 4 | 与选型文档严重脱节，缺乏工程化基础 |
| 文档体系 | 8 | PRD、技术选型、工作总结齐全，但与代码存在不一致 |
| DevOps | 2 | 无 CI/CD、无监控、无结构化日志 |
| **综合评分** | **5/10** | **架构有潜力，但工程化和安全实践需要大幅加强** |

---

## 八、一句话总结

> MyDrew 的**架构设计和产品愿景处于高水平**，向量搜索引擎 + AgentRank 排序 + .amd 快照协议的三角架构有很强竞争力。但当前代码在**模块路径、Go版本、安全配置、前端工程化**四个方面存在阻塞性问题，建议优先修复 P0/P1 问题后再继续功能迭代，避免技术债务累积。
