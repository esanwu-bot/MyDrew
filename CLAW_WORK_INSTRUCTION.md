# MyDrew — Kimi Claw Desktop 工作指令

## 项目背景

本地目录：`E:\workspace\MyDrew`

这是一个"智能体执行链路引擎"项目，目标是将"云匠邦"数字服务商平台从人力撮合升级为经验可复用的数字工厂。核心机制是 **Agent 快照（Snapshot）** 的复用、匹配与执行。

## 当前状态

- 本地目录 `E:\workspace\MyDrew` 已存在部分 Drew 实现代码
- 需要评估现有代码，决定是迭代还是重构
- 需要接入前端（基于深色代码编辑器风格）
- 需要实现 6 大场景：服务商品化、需求标准化、智能匹配、半自动化交付、平台验收、新人赋能

## 请 Kimi Claw 执行以下步骤

### Step 1：评估现有代码

请读取 `E:\workspace\MyDrew` 目录下所有文件，列出：
1. 完整目录结构（tree 视图）
2. 技术栈判断（Python/Node/Go/其他？）
3. 已有核心功能（快照存储？CLI？API？向量匹配？）
4. 配置文件内容（如果有 config.yaml, .env, package.json, requirements.txt 等）
5. 现有快照示例（如果有 .yaml/.json 的快照文件）

### Step 2：给出评估结论

基于现有代码，判断属于以下哪种情况：
- **A. 已有快照核心 + CLI** → 基于现有迭代，补充匹配引擎、QA 验收、数学期望模型
- **B. 只有前端页面或概念代码** → 保留前端 UI，后端用 Drew 核心引擎替换
- **C. 结构混乱/技术栈不匹配** → 重新搭建，迁移有价值逻辑

### Step 3：生成推进方案

根据评估结论，生成：
1. 更新的目录结构（如果需要重构）
2. 核心代码文件（snapshot.py, executor.py, matcher.py, cli.py 等）
3. 前端页面（基于深色代码编辑器风格，展示快照列表、执行链路、匹配结果）
4. 示例快照文件（至少 3 个：电商独立站、企业官网、小程序）
5. 数学期望模型脚本（expectation_model.py）

### Step 4：写入本地文件

将生成的所有文件直接写入 `E:\workspace\MyDrew` 对应目录，覆盖或增量更新。

## 关键设计规范

### 快照 Schema（drew-snapshot-schema.yaml）
```yaml
snapshot_id: "yjbg-001"
name: "跨境电商独立站（Shopify+Stripe）"
version: "4.2.0"
author: "工匠_老王"
price: 8000
tags: [电商, Shopify, 海外支付, 东南亚]
variables:
  - name: platform
    type: enum
    options: [Shopify, WooCommerce, Magento]
    default: Shopify
  - name: target_market
    type: string
steps:
  - id: 1
    name: "店铺初始化"
    tool: "shopify-cli"
    auto: true
  - id: 2
    name: "视觉设计"
    tool: "human"
    estimated_hours: 24
qa:
  - check: "支付流程测试"
    method: "auto"
metrics:
  reuse_count: 47
  avg_delivery_days: 3.2
  satisfaction: 0.98
```

### 核心模块清单
- `src/core/snapshot.py` — 快照 CRUD + 版本管理
- `src/core/executor.py` — DAG 执行引擎（支持自动节点 + 人工节点）
- `src/core/matcher.py` — 向量相似度匹配（需求快照 ↔ 工匠快照）
- `src/api/routes.py` — FastAPI 接口（注册、搜索、执行、验收）
- `src/cli/drew.py` — CLI 工具（init, register, search, run, clone）
- `models/expectation_model.py` — 数学期望模拟（复用率 vs 收入）
- `frontend/` — 前端页面（深色主题，展示快照市场、执行链路、匹配结果）

### 前端风格要求
- 深色主题（#1a1a2e, #16213e, #0f3460）
- 代码编辑器感（等宽字体、语法高亮、行号）
- 左侧边栏导航（类似 VS Code Sidebar）
- 主区域展示：快照列表、DAG 执行图、匹配结果、验收报告

## 商业模式要点（供代码逻辑参考）

| 收入类型 | 传统模式 | Drew 模式 |
|---|---|---|
| 撮合抽成 | 15% | 10% |
| 快照交易抽成 | 0 | 5%（每次复用） |
| 企业订阅（RFP） | 0 | ¥299/月 |
| 工匠订阅（快照库） | 0 | ¥99/月 |
| 验收仲裁服务 | 0 | ¥50/次 |

## 数学期望模型公式

```python
# 平台月度期望收入
E_revenue = N_projects * (
    0.10 * avg_project_value +           # 撮合费
    0.05 * avg_project_value * R_reuse + # 快照复用费
    299 * S_enterprise +                 # 企业订阅
    99 * S_freelancer +                  # 工匠订阅
    50 * N_arbitration                   # 仲裁服务
)

# 工匠月度期望收入
E_freelancer = N_orders * (
    avg_order_value * (1 - 0.10 - 0.05) -  # 扣除平台费
    C_snapshot_rental                       # 快照租赁成本（如果有）
) * E_efficiency_boost

# 效率提升系数（快照自动化带来的产能提升）
E_efficiency_boost = 1 + 0.8 * (1 - R_manual_work)
# R_manual_work = 人工工作占比（快照自动化后趋近于 0.2）
```

---
*指令生成时间：2026-06-14*
*目标：在 Kimi Claw Desktop 中完成 MyDrew 项目的评估与推进*
