import { getDb } from "../api/queries/connection";
import { categories, providers, services, cases, orders, reviews } from "./schema";

async function seed() {
  const db = getDb();

  // Clear existing data
  await db.delete(reviews);
  await db.delete(orders);
  await db.delete(cases);
  await db.delete(services);
  await db.delete(providers);
  await db.delete(categories);
  console.log("Cleared existing data");

  // 1. Seed categories
  const cats = await db.insert(categories).values([
    { name: "软件开发", slug: "software", icon: "Code2", description: "企业级软件开发、小程序、App、系统重构", sortOrder: 1 },
    { name: "品牌设计", slug: "design", icon: "Palette", description: "品牌策略、VI设计、UI/UX、包装设计", sortOrder: 2 },
    { name: "数字营销", slug: "marketing", icon: "TrendingUp", description: "SEO/SEM、内容营销、社交媒体运营", sortOrder: 3 },
    { name: "商业咨询", slug: "consulting", icon: "Lightbulb", description: "商业模式设计、数字化转型、融资辅导", sortOrder: 4 },
    { name: "AI智能", slug: "ai", icon: "Brain", description: "AI Agent定制、自动化部署、智能客服", sortOrder: 5 },
    { name: "影视制作", slug: "video", icon: "Clapperboard", description: "宣传片、产品视频、动画制作", sortOrder: 6 },
  ]).$returningId();

  console.log("Seeded categories:", cats.length);

  // 2. Seed providers
  const provs = await db.insert(providers).values([
    { userId: 1, companyName: "安联科技", logo: null, description: "专注金融级系统架构，微服务与云原生专家", contactName: "张工", contactPhone: "13800138001", location: "北京", verified: 1, rating: "4.9", completedOrders: 156, responseTime: "30min" },
    { userId: 1, companyName: "墨染设计", logo: null, description: "新锐品牌设计工作室，红点奖提名团队", contactName: "林设计", contactPhone: "13800138002", location: "上海", verified: 1, rating: "4.8", completedOrders: 89, responseTime: "1h" },
    { userId: 1, companyName: "增长黑客", logo: null, description: "数据驱动的出海增长团队", contactName: "王运营", contactPhone: "13800138003", location: "深圳", verified: 1, rating: "4.7", completedOrders: 214, responseTime: "2h" },
    { userId: 1, companyName: "创智咨询", logo: null, description: "CFA持证顾问团队，专注B2B SaaS战略", contactName: "陈顾问", contactPhone: "13800138004", location: "杭州", verified: 1, rating: "4.9", completedOrders: 67, responseTime: "4h" },
    { userId: 1, companyName: "智源AI Lab", logo: null, description: "大模型应用与AI Agent定制开发", contactName: "刘博士", contactPhone: "13800138005", location: "成都", verified: 1, rating: "5.0", completedOrders: 23, responseTime: "1h" },
  ]).$returningId();

  console.log("Seeded providers:", provs.length);

  // 3. Seed services
  const svcs = await db.insert(services).values([
    { providerId: provs[0].id, categoryId: cats[0].id, title: "企业级微服务架构设计与重构", slug: "microservice-arch", summary: "基于DDD的微服务拆分，K8s容器化部署，零停机迁移", description: "我们提供全套微服务架构咨询服务，包括领域驱动设计（DDD）、服务拆分策略、API网关设计、分布式事务处理、服务网格部署等。", priceFrom: "180000.00", priceTo: "500000.00", pricingUnit: "项目", deliveryDays: 90, tags: JSON.stringify(["微服务", "K8s", "DDD", "云原生"]), image: null, featured: 1, status: "active" as const },
    { providerId: provs[0].id, categoryId: cats[0].id, title: "微信小程序与H5定制开发", slug: "wechat-miniapp", summary: "从原型到上线的全流程小程序开发，支持电商、教育、O2O等场景", description: "提供微信小程序、支付宝小程序、H5页面的设计与开发服务，包含UI设计、前后端开发、测试上线全流程。", priceFrom: "30000.00", priceTo: "150000.00", pricingUnit: "项目", deliveryDays: 30, tags: JSON.stringify(["微信小程序", "H5", "前端开发"]), image: null, featured: 1, status: "active" as const },
    { providerId: provs[1].id, categoryId: cats[1].id, title: "品牌全案视觉升级", slug: "brand-design", summary: "品牌策略、VI系统、包装设计、空间设计一站式", description: "从品牌定位到视觉落地的全案设计服务，包含品牌故事梳理、Logo设计、VI手册、包装设计、门店空间设计。", priceFrom: "50000.00", priceTo: "200000.00", pricingUnit: "项目", deliveryDays: 45, tags: JSON.stringify(["品牌策略", "VI设计", "包装设计"]), image: null, featured: 1, status: "active" as const },
    { providerId: provs[1].id, categoryId: cats[1].id, title: "UI/UX产品界面设计", slug: "ui-ux-design", summary: "Web端与移动端的产品界面设计，交互原型与高保真视觉", description: "提供SaaS产品、App、官网的UI/UX设计服务，包含用户研究、信息架构、交互原型、高保真视觉稿。", priceFrom: "20000.00", priceTo: "80000.00", pricingUnit: "项目", deliveryDays: 21, tags: JSON.stringify(["UI设计", "UX设计", "原型设计"]), image: null, featured: 0, status: "active" as const },
    { providerId: provs[2].id, categoryId: cats[2].id, title: "出海独立站增长全案", slug: "overseas-growth", summary: "SEO+内容营销+KOL，构建可持续的自然流量体系", description: "针对品牌出海需求，提供独立站搭建、SEO优化、内容营销矩阵、KOL合作、广告投放优化等增长全案服务。", priceFrom: "60000.00", priceTo: "200000.00", pricingUnit: "项目", deliveryDays: 60, tags: JSON.stringify(["SEO", "内容营销", "KOL", "独立站"]), image: null, featured: 1, status: "active" as const },
    { providerId: provs[2].id, categoryId: cats[2].id, title: "数字营销与增长策略", slug: "digital-marketing", summary: "SEO/SEM、内容营销、社交媒体运营、增长黑客", description: "提供全方位的数字营销服务，包含竞品调研、关键词分析、内容矩阵策划、投放优化、月度增长复盘。", priceFrom: "8000.00", priceTo: "25000.00", pricingUnit: "月", deliveryDays: 30, tags: JSON.stringify(["SEO", "SEM", "社交媒体", "增长黑客"]), image: null, featured: 0, status: "active" as const },
    { providerId: provs[3].id, categoryId: cats[3].id, title: "商业模式与数字化战略咨询", slug: "business-consulting", summary: "商业模式设计、数字化转型、投融资对接、合规咨询", description: "提供商业模式画布梳理、数字化路径规划、投资人路演材料制作、数据合规与隐私评估等战略咨询服务。", priceFrom: "50000.00", priceTo: "300000.00", pricingUnit: "项目", deliveryDays: 60, tags: JSON.stringify(["商业模式", "数字化转型", "融资辅导"]), image: null, featured: 1, status: "active" as const },
    { providerId: provs[4].id, categoryId: cats[4].id, title: "AI Agent与自动化工作流定制", slug: "ai-agent", summary: "AI Agent定制、工作流自动化、智能客服、RPA部署", description: "基于大语言模型的AI Agent定制开发，包含智能客服、文档处理、工作流自动化、RPA流程部署等服务。", priceFrom: "50000.00", priceTo: "200000.00", pricingUnit: "项目", deliveryDays: 14, tags: JSON.stringify(["AI Agent", "RPA", "智能客服", "工作流自动化"]), image: null, featured: 1, status: "active" as const },
  ]).$returningId();

  console.log("Seeded services:", svcs.length);

  // 4. Seed cases
  await db.insert(cases).values([
    { serviceId: svcs[0].id, providerId: provs[0].id, title: "某城商行核心系统微服务重构", category: "软件开发", clientName: "某城商行", duration: "8个月", budget: "¥180万", tags: JSON.stringify(["微服务架构", "云原生", "金融级安全"]), challenge: "原系统为2009年建设的单体架构，代码量超过200万行，日常维护困难，高峰期频繁宕机。", solution: "采用DDD拆分47个微服务，基于K8s容器化部署，引入分布式事务框架Seata，实现数据库分库分表。", results: JSON.stringify(["QPS从1200提升至4800(+300%)", "P99延迟从2.3s降至180ms", "全年故障停机时间归零", "运维成本降低40%"]), credentials: JSON.stringify(["ISO 27001认证", "等保三级", "交付凭证已上链"]), image: null },
    { serviceId: svcs[2].id, providerId: provs[1].id, title: "新锐茶饮品牌「青山雾」全案视觉升级", category: "品牌设计", clientName: "青山雾茶饮", duration: "3个月", budget: "¥35万", tags: JSON.stringify(["品牌策略", "VI系统", "包装设计"]), challenge: "新品牌需在竞争激烈的茶饮红海中快速建立差异化认知，同时控制单店装修成本在15万以内。", solution: "以「东方草本」为核心定位，设计可模块化复制的轻量空间系统。包装采用环保可降解材料。", results: JSON.stringify(["首店月营收破80万", "小红书UGC 12万+", "品牌认知度调研达67%", "单店装修成本控制在12万"]), credentials: JSON.stringify(["红点设计奖提名", "交付凭证已上链"]), image: null },
    { serviceId: svcs[4].id, providerId: provs[2].id, title: "3C配件品牌出海独立站增长全案", category: "数字营销", clientName: "某3C品牌", duration: "6个月", budget: "¥60万", tags: JSON.stringify(["SEO", "内容营销", "KOL", "独立站"]), challenge: "品牌初出海，零品牌认知，广告成本持续攀升，需要建立可持续的自然流量获取能力。", solution: "构建三维内容矩阵，与50+垂直领域KOL建立长期合作，优化独立站转化率漏斗。", results: JSON.stringify(["自然搜索流量月均8.5万UV", "月GMV突破$120k", "广告ROI稳定在1:6.5", "复购率提升至34%"]), credentials: JSON.stringify(["Google Analytics认证", "交付凭证已上链"]), image: null },
    { serviceId: svcs[6].id, providerId: provs[3].id, title: "B2B SaaS企业商业模式重构与融资辅导", category: "商业咨询", clientName: "某SaaS企业", duration: "4个月", budget: "¥45万", tags: JSON.stringify(["商业模式", "定价策略", "融资辅导"]), challenge: "公司长期以项目制交付为主，现金流不稳定，客户流失率高，难以获得资本市场认可。", solution: "重新设计产品边界，将定制化功能抽象为标准模块，推出三档订阅定价。重构获客漏斗，建立PLG体系。", results: JSON.stringify(["ARR从80万增长至320万", "客户流失率从35%降至8%", "成功完成3000万A+轮融资", "LTV/CAC比从1.5提升至4.2"]), credentials: JSON.stringify(["CFA持证顾问", "交付凭证已上链"]), image: null },
  ]);

  console.log("Seeded cases: 4");

  // 5. Seed orders
  await db.insert(orders).values([
    { orderNo: "ORD20260001", userId: 1, serviceId: svcs[0].id, providerId: provs[0].id, requirementId: null, title: "企业官网定制开发", amount: "45000.00", status: "completed" as const, notes: "非常满意，交付准时" },
    { orderNo: "ORD20260002", userId: 1, serviceId: svcs[2].id, providerId: provs[1].id, requirementId: null, title: "品牌VI设计", amount: "68000.00", status: "in_progress" as const, notes: "设计稿已确认，进入制作阶段" },
    { orderNo: "ORD20260003", userId: 1, serviceId: svcs[7].id, providerId: provs[4].id, requirementId: null, title: "智能客服AI Agent", amount: "120000.00", status: "pending" as const, notes: null },
  ]);

  console.log("Seeded orders: 3");

  // 6. Seed reviews
  await db.insert(reviews).values([
    { orderId: 1, userId: 1, providerId: provs[0].id, rating: 5, content: "安联科技的专业度令人印象深刻，从需求分析到最终交付，每个环节都有严格的把控。系统上线后运行非常稳定。" },
  ]);

  console.log("Seeded reviews: 1");
  console.log("Seed completed successfully!");
}

seed().catch(console.error);
