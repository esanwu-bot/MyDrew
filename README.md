# MyDrew — 智能体执行链路引擎

## 项目概述

MyDrew 是一个将**云匠邦**数字服务商平台从人力撮合升级为**经验可复用的数字工厂**的引擎。核心机制是 **Agent 快照（Snapshot）** 的复用、匹配与执行。

### 核心价值
- **服务商品化**：将工匠的历史交付经验封装为可复用的快照
- **需求标准化**：企业需求通过变量化配置自动匹配最优快照
- **智能匹配**：向量语义 + 商业信誉的混合推荐引擎
- **半自动化交付**：DAG 执行引擎区分自动节点与人工节点
- **平台验收**：自动 QA + 人工确认 + 仲裁结算
- **新人赋能**：通过复用高满意度快照，新人也能快速交付

---

## 技术架构

```
┌────────────────────────────────────────────────────────────┐
│                     前端 (frontend/)                       │
│              深色代码编辑器主题 — 快照市场/匹配/执行            │
├────────────────────────────────────────────────────────────┤
│                     Python 商业层 (src/)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ snapshot │  │ matcher  │  │ executor │  │   qa     │  │
│  │ 快照CRUD  │  │ 智能匹配  │  │ DAG执行  │  │ 验收仲裁  │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  │
│  │   cli    │  │  routes  │  │ expectation_model        │  │
│  │ 命令行   │  │ FastAPI  │  │ 数学期望模拟              │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
├────────────────────────────────────────────────────────────┤
│                     Go 搜索引擎 (server/)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  API     │  │  Search  │  │ AgentRank│  │  Store   │  │
│  │ Handler  │→ │  Service │→ │  Ranking │  │  (PG)    │  │
│  └──────────┘  └────┬─────┘  └──────────┘  └──────────┘  │
│              ┌──────┴──────┐  ┌──────────────┐           │
│              │  Embedding   │  │  VectorStore │           │
│              │   (BGE-M3)  │  │  (Qdrant)    │           │
│              └──────────────┘  └──────────────┘           │
├────────────────────────────────────────────────────────────┤
│                     基础设施 (docker-compose.yml)            │
│              PostgreSQL 16 + Qdrant + BGE-M3 Embedding      │
└────────────────────────────────────────────────────────────┘
```

---

## 快速开始

### 1. 启动基础设施
```bash
make infra        # PostgreSQL + Qdrant
```

### 2. 启动 Go 搜索引擎（原有后端）
```bash
make server       # :8080
```

### 3. 启动 Python 商业 API（新增）
```bash
make py-server    # :8000
```

### 4. 注册示例快照
```bash
make py-seed
```

### 5. 打开前端
```bash
cd frontend
python -m http.server 3000
# 浏览器打开 http://localhost:3000
```

### 6. CLI 使用
```bash
# 搜索快照
make py-cli ARGS="search 跨境电商独立站 --budget=10000 --tags=电商,Shopify"

# 执行快照
make py-cli ARGS="run yjbg-001"

# 查看统计
make py-cli ARGS="stats"
```

---

## 目录结构

```
MyDrew/
├── server/                    # Go 后端（保留原有）
│   ├── cmd/server/main.go     # API 入口
│   ├── internal/              # 搜索引擎核心
│   └── testdata/              # .amd 测试数据
├── embedding-service/         # BGE-M3 嵌入服务
├── src/                       # Python 商业层（新增）
│   ├── core/
│   │   ├── snapshot.py        # 快照 CRUD + 版本管理
│   │   ├── executor.py        # DAG 执行引擎
│   │   ├── matcher.py         # 向量相似度匹配
│   │   └── qa.py              # QA 验收引擎
│   ├── api/
│   │   └── routes.py          # FastAPI REST 接口
│   ├── cli/
│   │   └── drew.py            # CLI 工具
│   ├── models/
│   │   └── expectation_model.py  # 数学期望模型
│   └── requirements.txt
├── frontend/                  # 深色主题前端（新增）
│   ├── css/theme.css
│   ├── index.html             # 快照市场
│   ├── match.html             # 智能匹配
│   └── snapshot.html          # 快照详情 + DAG
├── snapshots/                 # 示例快照（新增）
│   ├── ecom-shopify.yaml      # 电商独立站
│   ├── corporate-website.yaml # 企业官网
│   └── miniprogram.yaml       # 微信小程序
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## 数学期望模型

### 平台月度期望收入
```
E_revenue = N_projects * (
    0.10 * avg_project_value +           # 撮合费
    0.05 * avg_project_value * R_reuse + # 快照复用费
    299 * S_enterprise +                 # 企业订阅
    99 * S_freelancer +                  # 工匠订阅
    50 * N_arbitration                   # 仲裁服务
)
```

### 工匠月度期望收入
```
E_freelancer = N_orders * (
    avg_order_value * (1 - 0.10 - 0.05) -  # 扣除平台费
    C_snapshot_rental                       # 快照租赁成本
) * E_efficiency_boost

E_efficiency_boost = 1 + 0.8 * (1 - R_manual_work)
```

---

## 商业模式对比

| 收入类型 | 传统模式 | Drew 模式 |
|---|---|---|
| 撮合抽成 | 15% | 10% |
| 快照交易抽成 | 0 | 5%（每次复用） |
| 企业订阅（RFP） | 0 | ¥299/月 |
| 工匠订阅（快照库） | 0 | ¥99/月 |
| 验收仲裁服务 | 0 | ¥50/次 |

---

## 下一步

- [ ] 集成 Go 搜索 API 到 Python Matcher（替换本地关键词搜索）
- [ ] 实现 DAG 可视化（Canvas/SVG）
- [ ] 接入真实的 Shopify / Stripe / 微信 API 工具
- [ ] 实现 Blueprint Parser（.amd → StateGraph）
- [ ] Web3 支付通道（Phase 3）

---

*生成时间：2026-06-14*  
*评估结论：基于现有 Go 后端迭代，新建 Python 商业层 + 前端*
