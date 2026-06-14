# qa.py — QA Acceptance Engine (Auto + Manual)
"""
Drew QA — 平台验收与仲裁引擎
- 自动验收：检查清单自动验证（API 测试、Schema 校验、截图比对）
- 人工验收：客户/平台仲裁员确认
- 仲裁服务：争议处理、退款判定、扣款执行
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Callable
from enum import Enum, auto


class QAResult(Enum):
    PASS = auto()
    FAIL = auto()
    PENDING = auto()
    DISPUTE = auto()
    PARTIAL = auto()


class QAMethod(Enum):
    AUTO = auto()
    MANUAL = auto()
    ARBITRATION = auto()


@dataclass
class QAReportItem:
    check_id: str
    check_name: str
    method: QAMethod
    result: QAResult
    detail: str = ""
    evidence: Any = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class QAReport:
    snapshot_id: str
    order_id: str
    items: List[QAReportItem] = field(default_factory=list)
    overall: QAResult = QAResult.PENDING
    final_score: float = 0.0  # 0.0 - 1.0
    arbitration_fee: float = 50.0  # 仲裁服务费
    refund_amount: float = 0.0
    platform_deduction: float = 0.0  # 平台应扣除费用
    craftsman_payout: float = 0.0
    completed_at: Optional[str] = None


class QAAcceptanceEngine:
    """QA 验收引擎"""

    def __init__(self, auto_checkers: Optional[Dict[str, Callable]] = None):
        self.auto_checkers = auto_checkers or {}
        self._arbitration_history: List[QAReport] = []

    def register_checker(self, name: str, fn: Callable) -> None:
        self.auto_checkers[name] = fn

    def run_acceptance(self, snapshot, order_id: str, execution_result: Any) -> QAReport:
        """
        执行完整验收流程：
        1. 自动检查清单
        2. 人工检查（如配置）
        3. 汇总评分与资金结算
        """
        report = QAReport(snapshot_id=snapshot.snapshot_id, order_id=order_id)

        # 1. 自动检查
        for qa in snapshot.qa:
            if qa.method == "auto":
                item = self._run_auto_check(qa, execution_result)
                report.items.append(item)

        # 2. 人工检查（标记为待人工确认）
        for qa in snapshot.qa:
            if qa.method == "manual":
                report.items.append(QAReportItem(
                    check_id=f"manual-{qa.check}",
                    check_name=qa.check,
                    method=QAMethod.MANUAL,
                    result=QAResult.PENDING,
                    detail="等待人工确认",
                ))

        # 3. 结算计算
        report = self._calculate_settlement(report, snapshot)
        return report

    def _run_auto_check(self, qa, execution_result: Any) -> QAReportItem:
        """执行单个自动检查"""
        check_id = f"auto-{qa.check}"
        checker_fn = self.auto_checkers.get(qa.check)
        if checker_fn:
            try:
                ok, detail = checker_fn(execution_result)
                return QAReportItem(
                    check_id=check_id,
                    check_name=qa.check,
                    method=QAMethod.AUTO,
                    result=QAResult.PASS if ok else QAResult.FAIL,
                    detail=detail,
                )
            except Exception as e:
                return QAReportItem(
                    check_id=check_id,
                    check_name=qa.check,
                    method=QAMethod.AUTO,
                    result=QAResult.FAIL,
                    detail=f"Checker error: {e}",
                )
        # 无 checker 时降级为人工
        return QAReportItem(
            check_id=check_id,
            check_name=qa.check,
            method=QAMethod.MANUAL,
            result=QAResult.PENDING,
            detail="未配置自动检查器，需人工确认",
        )

    def _calculate_settlement(self, report: QAReport, snapshot) -> QAReport:
        """计算验收结果与资金结算"""
        auto_items = [i for i in report.items if i.method == QAMethod.AUTO]
        manual_items = [i for i in report.items if i.method == QAMethod.MANUAL]

        # 自动检查评分
        auto_pass = sum(1 for i in auto_items if i.result == QAResult.PASS)
        auto_total = len(auto_items) if auto_items else 1
        auto_score = auto_pass / auto_total

        # 人工检查评分（如已完成）
        manual_pass = sum(1 for i in manual_items if i.result == QAResult.PASS)
        manual_total = len(manual_items) if manual_items else 1
        manual_score = manual_pass / manual_total

        # 综合分：自动 60% + 人工 40%
        report.final_score = auto_score * 0.6 + manual_score * 0.4

        # 判定整体结果
        if any(i.result == QAResult.DISPUTE for i in report.items):
            report.overall = QAResult.DISPUTE
        elif report.final_score >= 0.85:
            report.overall = QAResult.PASS
        elif report.final_score >= 0.6:
            report.overall = QAResult.PARTIAL
        else:
            report.overall = QAResult.FAIL

        # 资金结算（基于验收结果）
        price = snapshot.price
        if report.overall == QAResult.PASS:
            report.refund_amount = 0.0
            report.platform_deduction = price * 0.15  # 15% 平台抽成（撮合+快照复用）
            report.craftsman_payout = price - report.platform_deduction
        elif report.overall == QAResult.PARTIAL:
            report.refund_amount = price * 0.20
            report.platform_deduction = price * 0.10
            report.craftsman_payout = price - report.refund_amount - report.platform_deduction
        elif report.overall == QAResult.FAIL:
            report.refund_amount = price * 0.80
            report.platform_deduction = price * 0.05
            report.craftsman_payout = price - report.refund_amount - report.platform_deduction
        else:  # DISPUTE
            report.refund_amount = 0.0
            report.platform_deduction = 0.0
            report.craftsman_payout = 0.0

        report.completed_at = datetime.now(timezone.utc).isoformat()
        return report

    def manual_confirm(self, report: QAReport, check_id: str, passed: bool, detail: str = "") -> QAReport:
        """人工确认某个检查项"""
        for item in report.items:
            if item.check_id == check_id and item.method == QAMethod.MANUAL:
                item.result = QAResult.PASS if passed else QAResult.FAIL
                item.detail = detail or item.detail
                item.timestamp = datetime.now(timezone.utc).isoformat()
                break
        # 重新计算结算
        from .snapshot import SnapshotStore
        # 这里需要重新获取 snapshot，简化处理
        return report

    def escalate_arbitration(self, report: QAReport, reason: str) -> QAReport:
        """升级至平台仲裁"""
        report.overall = QAResult.DISPUTE
        report.items.append(QAReportItem(
            check_id="arbitration-1",
            check_name="平台仲裁",
            method=QAMethod.ARBITRATION,
            result=QAResult.PENDING,
            detail=f"仲裁原因: {reason}",
        ))
        # 仲裁费
        report.arbitration_fee = 50.0
        self._arbitration_history.append(report)
        return report

    def resolve_arbitration(self, report: QAReport, decision: str, craftsman_share: float = 0.5) -> QAReport:
        """仲裁员裁决"""
        price = report.craftsman_payout + report.refund_amount + report.platform_deduction
        if decision == "full_customer":
            report.refund_amount = price * 0.90
            report.craftsman_payout = price * 0.05
            report.platform_deduction = price * 0.05 + report.arbitration_fee
        elif decision == "full_craftsman":
            report.refund_amount = 0.0
            report.platform_deduction = price * 0.15 + report.arbitration_fee
            report.craftsman_payout = price - report.platform_deduction
        elif decision == "split":
            report.refund_amount = price * (1 - craftsman_share)
            report.platform_deduction = price * 0.10 + report.arbitration_fee
            report.craftsman_payout = price - report.refund_amount - report.platform_deduction

        report.overall = QAResult.PASS if report.craftsman_payout > report.refund_amount else QAResult.FAIL
        report.completed_at = datetime.now(timezone.utc).isoformat()
        return report

    def generate_report_markdown(self, report: QAReport) -> str:
        """生成验收报告 Markdown"""
        status_map = {
            QAResult.PASS: "✅ 通过",
            QAResult.FAIL: "❌ 未通过",
            QAResult.PENDING: "⏳ 待确认",
            QAResult.DISPUTE: "⚖️ 仲裁中",
            QAResult.PARTIAL: "⚠️ 部分通过",
        }
        lines = [
            "# 平台验收报告",
            f"- **订单 ID**: {report.order_id}",
            f"- **快照 ID**: {report.snapshot_id}",
            f"- **整体结果**: {status_map.get(report.overall, '未知')}",
            f"- **综合评分**: {report.final_score:.1%}",
            f"- **完成时间**: {report.completed_at}",
            "",
            "## 检查清单",
            "| 检查项 | 方法 | 结果 | 详情 |",
            "|--------|------|------|------|",
        ]
        for item in report.items:
            method = {"AUTO": "🤖", "MANUAL": "👤", "ARBITRATION": "⚖️"}.get(item.method.name, "❓")
            status = status_map.get(item.result, "?")
            lines.append(f"| {item.check_name} | {method} {item.method.name} | {status} | {item.detail} |")
        lines.extend([
            "",
            "## 资金结算",
            f"- 退款给客户: ¥{report.refund_amount:,.2f}",
            f"- 平台抽成+服务费: ¥{report.platform_deduction:,.2f}",
            f"- 工匠实际收入: ¥{report.craftsman_payout:,.2f}",
        ])
        if report.overall == QAResult.DISPUTE:
            lines.append(f"- **仲裁费**: ¥{report.arbitration_fee:,.2f}")
        return "\n".join(lines)
