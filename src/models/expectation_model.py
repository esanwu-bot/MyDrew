# expectation_model.py — Mathematical Expectation Model (Reuse Rate vs Revenue)
"""
Drew 数学期望模型 — 平台与工匠月度收入模拟
基于 CLAW_WORK_INSTRUCTION.md 中的公式实现
支持参数敏感性分析与可视化输出
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Any


@dataclass
class RevenueParams:
    """收入模型参数"""
    # 平台参数
    n_projects: int = 100  # 月度项目数
    avg_project_value: float = 5000.0  # 平均项目金额
    r_reuse: float = 0.3  # 快照复用率
    s_enterprise: int = 10  # 企业订阅数
    s_freelancer: int = 50  # 工匠订阅数
    n_arbitration: int = 5  # 仲裁次数

    # 工匠参数
    n_orders: int = 100  # 工匠月度接单数
    avg_order_value: float = 5000.0
    c_snapshot_rental: float = 0.0  # 快照租赁成本
    r_manual_work: float = 0.2  # 人工工作占比（快照自动化后趋近 0.2）

    # 费率
    match_rate: float = 0.10  # 撮合抽成
    reuse_rate: float = 0.05  # 快照复用抽成
    enterprise_fee: float = 299.0  # 企业订阅/月
    freelancer_fee: float = 99.0  # 工匠订阅/月
    arbitration_fee: float = 50.0  # 仲裁服务费


class ExpectationModel:
    """数学期望模型"""

    def __init__(self):
        self._history: List[Dict] = []

    def calculate_platform_revenue(self, p: RevenueParams) -> Dict[str, float]:
        """
        平台月度期望收入
        E_revenue = N_projects * (
            0.10 * avg_project_value +
            0.05 * avg_project_value * R_reuse +
            299 * S_enterprise +
            99 * S_freelancer +
            50 * N_arbitration
        )
        """
        match_income = p.match_rate * p.avg_project_value
        reuse_income = p.reuse_rate * p.avg_project_value * p.r_reuse
        subscription_income = (
            p.enterprise_fee * p.s_enterprise +
            p.freelancer_fee * p.s_freelancer
        )
        arbitration_income = p.arbitration_fee * p.n_arbitration

        per_project = match_income + reuse_income + subscription_income / max(p.n_projects, 1) + arbitration_income / max(p.n_projects, 1)
        total = p.n_projects * per_project

        return {
            "match_income": match_income * p.n_projects,
            "reuse_income": reuse_income * p.n_projects,
            "subscription_income": subscription_income,
            "arbitration_income": arbitration_income,
            "total": total,
            "per_project": per_project,
        }

    def calculate_freelancer_revenue(self, p: RevenueParams) -> Dict[str, float]:
        """
        工匠月度期望收入
        E_freelancer = N_orders * (
            avg_order_value * (1 - 0.10 - 0.05) -
            C_snapshot_rental
        ) * E_efficiency_boost

        E_efficiency_boost = 1 + 0.8 * (1 - R_manual_work)
        """
        platform_deduction = p.match_rate + p.reuse_rate
        net_per_order = p.avg_order_value * (1 - platform_deduction) - p.c_snapshot_rental
        efficiency_boost = 1 + 0.8 * (1 - p.r_manual_work)
        total = p.n_orders * net_per_order * efficiency_boost

        return {
            "net_per_order": net_per_order,
            "efficiency_boost": efficiency_boost,
            "platform_deduction_rate": platform_deduction,
            "total": total,
        }

    def simulate(self, **kwargs) -> Dict[str, Any]:
        """运行完整模拟并返回报告"""
        p = RevenueParams(**kwargs)
        platform = self.calculate_platform_revenue(p)
        freelancer = self.calculate_freelancer_revenue(p)

        result = {
            "params": asdict(p),
            "platform_revenue": round(platform["total"], 2),
            "platform_breakdown": {
                k: round(v, 2) for k, v in platform.items() if k != "total"
            },
            "freelancer_revenue": round(freelancer["total"], 2),
            "freelancer_breakdown": {
                k: round(v, 2) for k, v in freelancer.items() if k != "total"
            },
            "revenue_per_project": round(platform["per_project"], 2),
            "efficiency_boost": round(freelancer["efficiency_boost"], 3),
        }
        self._history.append(result)
        return result

    def sensitivity_reuse_rate(self, r_range=(0.0, 1.0, 0.1), **base_params) -> List[Dict]:
        """复用率敏感性分析"""
        results = []
        start, end, step = r_range
        r = start
        while r <= end:
            p = RevenueParams(**base_params, r_reuse=r)
            platform = self.calculate_platform_revenue(p)
            freelancer = self.calculate_freelancer_revenue(p)
            results.append({
                "r_reuse": round(r, 2),
                "platform_revenue": round(platform["total"], 2),
                "freelancer_revenue": round(freelancer["total"], 2),
            })
            r += step
        return results

    def sensitivity_price(self, price_range=(1000, 20000, 1000), **base_params) -> List[Dict]:
        """价格敏感性分析"""
        results = []
        start, end, step = price_range
        price = start
        while price <= end:
            p = RevenueParams(**base_params, avg_project_value=price, avg_order_value=price)
            platform = self.calculate_platform_revenue(p)
            freelancer = self.calculate_freelancer_revenue(p)
            results.append({
                "price": price,
                "platform_revenue": round(platform["total"], 2),
                "freelancer_revenue": round(freelancer["total"], 2),
            })
            price += step
        return results

    def generate_markdown_report(self, result: Dict) -> str:
        """生成 Markdown 报告"""
        p = result["params"]
        lines = [
            "# Drew 月度收入期望模型报告",
            "",
            "## 输入参数",
            f"- 月度项目数: {p['n_projects']}",
            f"- 平均项目金额: ¥{p['avg_project_value']:,.0f}",
            f"- 快照复用率: {p['r_reuse']:.0%}",
            f"- 企业订阅: {p['s_enterprise']} 家",
            f"- 工匠订阅: {p['s_freelancer']} 人",
            f"- 仲裁次数: {p['n_arbitration']} 次",
            f"- 人工工作占比: {p['r_manual_work']:.0%}",
            "",
            "## 平台收入分析",
            f"- **总期望收入**: ¥{result['platform_revenue']:,.2f}",
            f"  - 撮合费收入: ¥{result['platform_breakdown']['match_income']:,.2f}",
            f"  - 快照复用费: ¥{result['platform_breakdown']['reuse_income']:,.2f}",
            f"  - 订阅收入: ¥{result['platform_breakdown']['subscription_income']:,.2f}",
            f"  - 仲裁服务: ¥{result['platform_breakdown']['arbitration_income']:,.2f}",
            f"  - 单项目收入: ¥{result['revenue_per_project']:,.2f}",
            "",
            "## 工匠收入分析",
            f"- **总期望收入**: ¥{result['freelancer_revenue']:,.2f}",
            f"  - 效率提升系数: {result['efficiency_boost']:.2f}x",
            f"  - 扣除平台费后单笔: ¥{result['freelancer_breakdown']['net_per_order']:,.2f}",
            f"  - 平台总抽成率: {result['freelancer_breakdown']['platform_deduction_rate']:.0%}",
            "",
            "## 关键洞察",
            "1. **复用率杠杆**: 快照复用率每提升 10%，平台复用费收入增长约 ¥{:.0f}".format(
                p['n_projects'] * p['avg_project_value'] * 0.05 * 0.1
            ),
            "2. **效率飞轮**: 工匠自动化后（人工占比降至 20%），产能提升 {:.0f}%".format(
                (result['efficiency_boost'] - 1) * 100
            ),
            "3. **订阅基本盘**: 企业+工匠订阅收入占总收入 {:.1%}".format(
                result['platform_breakdown']['subscription_income'] / result['platform_revenue'] if result['platform_revenue'] else 0
            ),
        ]
        return "\n".join(lines)

    def compare_modes(self, traditional_rate: float = 0.15, drew_rate: float = 0.15) -> Dict[str, Any]:
        """对比传统撮合 vs Drew 模式收入"""
        base = RevenueParams()
        traditional = base.n_projects * base.avg_project_value * traditional_rate
        drew = self.calculate_platform_revenue(base)["total"]
        return {
            "traditional_revenue": round(traditional, 2),
            "drew_revenue": round(drew, 2),
            "difference": round(drew - traditional, 2),
            "growth_rate": round((drew - traditional) / traditional, 3) if traditional else 0.0,
            "explanation": "Drew 模式通过快照复用费+订阅收入，在撮合费率降低的同时实现总收入增长",
        }
