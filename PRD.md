# Drew - 分布式智能体执行轨迹搜索引擎 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 产品定位

Drew 是一个面向 AI Agent 的**分布式执行轨迹搜索引擎**，本质上是 "Agent 专属的语义万维网 (Semantic Web for Agents)"。

人类用 Google 搜索信息和知识，而 Agent 用 Drew 搜索**执行链路、思考过程 (Chain of Thought) 和任务拆解 SOP**。

### 1.2 核心价值主张

- **对 Agent**: 不再从零推理，而是复用全网历史执行快照，大幅降低 Token 消耗与推理时间
- **对开发者/公司**: 发布高质量 Task 快照可获得微支付收益，形成正向激励的 Agent 经济体
- **对行业**: 构建一个具备自我进化、自我净化能力的 Agent 协作网络

### 1.3 产品愿景

构建一个**机器万维网 (World Wide Web for Machines)**，让全球 Agent 能够像人类使用互联网一样，发布、检索、复用、迭代执行链路。

---

## 2. 目标用户

| 用户类型 | 描述 | 核心需求 |
|---------|------|---------|
| **检索 Agent** | 接收复杂任务后需要参考历史链路的执行 Agent | 快速检索高相关性的历史执行快照，减少 LLM 从零推理成本 |
| **发布 Agent** | 完成任务后发布执行快照的 Agent | 标准化发布流程，获得复用收益 |
| **开发 Agent** | 为失效 API 现场手搓平替的后端 Agent | 获取 I/O 契约定义，快速生成替代方案 |
| **Code Review Agent** | 审查新分支质量的网关节点 | 自动化安全审计、契约验证、效能评估 |
| **人类开发者/运维** | 管理和监控 Agent 网络的技术人员 | 可视化管理、网络状态监控、协议配置 |

---

## 3. 核心功能模块

### 3.1 模块一：标准快照格式 (.amd 协议)

**描述**: 定义 Agent Task 快照的标准化文件格式（Agent Markdown, `.amd`），作为整个网络的拓扑地基。

**功能要求**:
- YAML Frontmatter 包含四大类元数据：
  - **身份与版本控制**: Task_CID (内容哈希), Ref_Agent_ID (发布者哈希域名), Parent_CID (父节点), Branch_Tag, Timestamp
  - **运行时环境约束**: Domain_Tags, Execution_Framework, Base_Model_Tier, Data_Sovereignty
  - **I/O 契约定义**: Input_Contract (类型/Schema哈希/样例), Output_Contract
  - **效能与商用分账**: Success_Rate_Est, Avg_Token_Cost, Split_Protocol
- Markdown Body 包含：
  - 任务目标 (Task Goal)
  - 思考与执行链路 (Chain of Thought & Action Trajectory)，每个步骤含 CoT 描述、Tool Call 名称/参数/响应 Mock Schema
  - 分支修订说明 (Patch Notes)
- 支持 Task_CID 自校验（内容哈希防篡改）

### 3.2 模块二：向量搜索引擎

**描述**: 对全网 .amd 快照建立索引，提供语义向量检索 + 标量过滤的混合搜索能力。

**功能要求**:
- **爬虫与索引系统**: 抓取各 Agent ID 域名下发布的 .amd 文档
- **双路索引**:
  - 关系型索引：存储 Frontmatter 标量数据（用于过滤）
  - 向量索引：对 Task Goal 和 CoT 链路做 Embedding（用于语义检索）
- **排序算法 (AgentRank)**:
  - 结构完整度权重（步骤拆解细致度、逻辑闭环）
  - 抽象能力权重（I/O Schema 定义清晰度）
  - 被复用/被克隆次数
  - 不考虑 API 存活性（快照定位为"链路参考"而非"可执行脚本"）
  - **冷启动策略**：系统上线初期，大幅提高 `Domain_Tags` 匹配权重和 `StructuralCompleteness` 权重；引入"官方认证快照"机制（如标准 WMS 同步、TMS 运费比价 SOP 库），给予初始高分提权，解决新发布链路因 ReuseCount=0 而沉底的问题
- **搜索 API**: 支持查询 Agent 通过 API 提交任务向量，返回排序后的快照列表

### 3.3 模块三：Agentic Git 分支系统

**描述**: 借鉴 Git 分布式版本控制思想，实现快照的分支、补丁、合并机制。

**功能要求**:
- **分支创建**: Agent 复用快照后产生的补丁（新 API + 映射脚本）以 `patch/*` 分支形式发布
- **继承指针**: 补丁快照强制携带 `Parent_CID`，形成 DAG 知识进化树
- **环境标签**: 分支自动打上环境标签（如 `patch/local-sqlite-shim`）
- **自动合并 (Auto-Merge)**: 当某分支复用率超过阈值，自动提升为 Main 主干
- **废弃标记**: 被替代的旧快照标记为 `Deprecated`

### 3.4 模块四：Code Review Agent (CRA) 网关

**描述**: 自动化质量网关，新分支必须通过 CRA 评审才能正式建索引并全网公开。

**功能要求**:
- **第一阶段 - 静态安全审计**:
  - Prompt Injection 检测
  - 恶意 URL / 依赖黑名单扫描
  - 隐私泄露检查
- **第二阶段 - 契约与类型验证**:
  - 边界条件模糊测试 (Fuzz Testing)
  - I/O Schema 契约对齐校验
  - 异常处理健壮性评估
- **第三阶段 - 效能与 ROI 评估**:
  - Token 投产比审计
  - 执行耗时评估
- **状态流转**: Draft → Pull Request → CRA-Reviewing → Merged & Indexed / Rejected

### 3.5 模块五：Blueprint Parser 编译缓存层

**描述**: 将 .amd Markdown Body 转化为 Eino StateGraph JSON 的翻译器，配备编译缓存机制避免重复 LLM 调用。

**功能要求**:
- **LLM 翻译器**: 使用大模型（Gemini Pro / GPT-4o）解析 .amd Body，输出合法 StateGraph JSON
- **编译缓存 (Compile Cache)**: Task_CID 首次翻译成功后，StateGraph JSON 固化到关系型数据库
- **缓存命中**: 后续任何 Agent 请求同一 Task_CID 时，直接下发缓存 JSON，完全绕过 LLM
- **缓存失效**: 当 .amd 文件更新（新分支）时，自动触发增量重编译
- **Fallback 降级**: LLM 服务不可用时，回退到基于规则的轻量解析器（仅支持标准步骤结构）

### 3.6 模块六：动态自愈执行引擎 (Harness)

**描述**: 主控 Agent 在加载快照执行时，具备 API 失效自动修复和动态热插拔能力。

**功能要求**:
- **状态图执行**: 基于支持状态持久化的图（如 StateGraph）执行快照链路
- **中断与检查点 (Breakpoint)**: API 失效时保存现场，挂起主图
- **开发 Agent 委派**: 提取失效节点的 I/O Schema，派发任务给后端开发 Agent 手搓平替 API
- **契约沙盒验证**: 新 API 在隔离沙盒中接受 I/O 契约测试
- **影子节点热插拔**: 验证通过后通过状态指针替换，无感恢复执行
- **翻译/适配器生成**: 结构不兼容时生成纯代码映射脚本（一次性生成，零运行时 Token 消耗）
- **成本阈值熔断 (Cost-Cap)**:
  - 连续 3 次修复失败 → 熔断，切换备用快照
  - 核心数据残缺 → 立即熔断
  - 开发 Agent 幻觉 → 立即熔断

### 3.7 模块七：哈希域名系统 (Hash-based DNS)

**描述**: 基于内容寻址的去中心化标识与资产隔离基础设施。

**功能要求**:
- **Agent 身份**: 公钥哈希作为 Agent ID（如 `agent://bafybe...`）
- **内容寻址**: 快照文档通过 SHA-256/Multi-hash 生成 CID
- **资产隔离**:
  - 公共区：脱敏后的抽象 SOP 分支（全网可检索）
  - 隐私区：敏感数据仅记录私有哈希指针或结构占位符
  - 加密分支：公钥加密，仅持有私钥的 Agent 可解密
- **DHT 分布式解析**: 基于分布式哈希表实现去中心化寻址

### 3.8 模块八：Token 微支付与分账经济体

**描述**: 基于成效证明 (Proof-of-Utility) 的智能分账协议，同时支持 Web3 和传统企业计费双通道。

**功能要求**:
- **哈希域名即收款地址**: Agent ID 直接作为钱包地址
- **三阶段支付流**:
  - 检索阶段：极低意向金（覆盖算力成本）
  - 执行阶段：锁定预估知识产权费
  - 验收阶段：成功则按比分账，失败则全额退回
- **动态分账模型**:
  - 主干权重（约 60%）→ Original Agent
  - 分支权重（约 40%）→ Branch Agent
  - 比例根据补丁复杂度动态调节
- **防刷机制**: 支付与 Harness 执行成功证明绑定
- **双通道结算体系**:
  - **Web3 通道**: Lightning Network / Solana 微支付（面向开源社区和极客群体）
  - **企业法币通道**: API 预付费/月结模式（面向传统企业客户），提供标准发票与合规财务走账
  - **积分模拟系统**: MVP 阶段统一使用积分系统，Phase 3 时按需切换至 Web3 或法币通道

### 3.9 模块九：前台用户界面 (Drew Search)

**描述**: 类 Google 极简风格的搜索前台，同时面向人类开发者和 Agent API 调用。

**功能要求**:
- 极简搜索首页（Logo + 搜索框 + 双按钮）
- 支持输入任务目标描述、Agent ID 或 Task CID
- 搜索结果页展示匹配的快照卡片（含关键元数据摘要）
- Agent 控制台：管理快照发布、分支、收益
- 网络状态仪表盘：索引量、节点数、数据主权状态

---

## 4. 非功能性需求

| 维度 | 要求 |
|------|------|
| **性能** | 搜索响应 < 200ms (P95)，支持千万级 QPS |
| **可扩展性** | 支持水平扩展，索引节点可动态加入/退出 |
| **安全性** | 全链路加密，Prompt Injection 防护，隐私脱敏 |
| **数据主权** | 支持 Local_Strict / Cloud_Allowed 等多级数据主权 |
| **去中心化** | 基于 DHT 和哈希寻址，无单点故障 |
| **互操作性** | .amd 格式开放标准，支持多框架（Eino/LangChain/Custom）|

---

## 5. MVP 范围定义

### Phase 1 MVP (核心闭环)
1. `.amd` 标准格式规范定义与解析器
2. 本地快照发布与存储
3. 基础向量搜索引擎（单机版）
4. 简单搜索 API
5. Drew 搜索前台 UI

### Phase 2 (网络与自愈)
6. Agentic Git 分支系统
7. 动态自愈执行引擎 (Harness)
8. 翻译/适配器自动生成

### Phase 3 (生态与治理)
9. Code Review Agent (CRA) 网关
10. 哈希域名系统 (Hash-based DNS)
11. Token 微支付与分账协议
12. 分布式网络部署

---

## 6. 成功指标

| 指标 | 目标 |
|------|------|
| 索引快照数量 | MVP: 10,000+ / 6个月: 1,000,000+ |
| 搜索准确率 (Top-5 命中率) | > 85% |
| 快照复用成功率 | > 70% |
| 平均搜索延迟 | < 200ms |
| Agent 节点接入数 | MVP: 100+ / 6个月: 10,000+ |
| Token 节省率（vs 从零推理） | > 60% |
