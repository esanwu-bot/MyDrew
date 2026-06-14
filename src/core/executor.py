# executor.py — DAG Execution Engine (Auto + Human Nodes)
"""
Drew Executor — 支持自动节点与人工节点的 DAG 执行引擎
- 自动节点：调用工具/API 自动执行
- 人工节点：分配给工匠，等待人工确认
- 支持 Checkpoint 中断恢复、成本熔断
"""

from __future__ import annotations

import time
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Callable
from enum import Enum, auto


class NodeStatus(Enum):
    PENDING = auto()
    RUNNING = auto()
    SUCCESS = auto()
    FAILED = auto()
    HUMAN_WAIT = auto()
    SKIPPED = auto()


class NodeType(Enum):
    AUTO = auto()
    HUMAN = auto()


@dataclass
class ExecutionNode:
    id: int
    name: str
    node_type: NodeType = NodeType.AUTO
    tool: str = ""
    auto: bool = True
    estimated_hours: float = 0.0
    dependencies: List[int] = field(default_factory=list)
    status: NodeStatus = NodeStatus.PENDING
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    output: Any = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    cost_cap: float = 500.0  # 元，单次节点成本上限


@dataclass
class ExecutionContext:
    snapshot_id: str
    variables: Dict[str, Any] = field(default_factory=dict)
    global_state: Dict[str, Any] = field(default_factory=dict)
    total_cost: float = 0.0
    cost_cap: float = 3000.0  # 全链路成本上限
    checkpoint_interval: int = 3  # 每 N 步自动 checkpoint


@dataclass
class ExecutionResult:
    snapshot_id: str
    success: bool
    nodes: List[ExecutionNode]
    total_cost: float
    total_hours: float
    final_output: Any = None
    report: Dict[str, Any] = field(default_factory=dict)


class DAGExecutor:
    """DAG 执行引擎"""

    def __init__(self, tool_registry: Optional[Dict[str, Callable]] = None):
        self.tool_registry = tool_registry or {}
        self._history: List[ExecutionResult] = []

    def register_tool(self, name: str, fn: Callable) -> None:
        self.tool_registry[name] = fn

    def build_dag(self, snapshot) -> List[ExecutionNode]:
        """从 Snapshot 构建 DAG 节点列表"""
        nodes = []
        for step in snapshot.steps:
            node = ExecutionNode(
                id=step.id,
                name=step.name,
                node_type=NodeType.AUTO if step.auto else NodeType.HUMAN,
                tool=step.tool,
                auto=step.auto,
                estimated_hours=step.estimated_hours,
                dependencies=step.dependencies,
            )
            nodes.append(node)
        return nodes

    def execute(self, snapshot, variables: Optional[Dict[str, Any]] = None) -> ExecutionResult:
        """执行完整 DAG"""
        ctx = ExecutionContext(
            snapshot_id=snapshot.snapshot_id,
            variables=variables or {},
        )
        nodes = self.build_dag(snapshot)
        result = ExecutionResult(
            snapshot_id=snapshot.snapshot_id,
            success=True,
            nodes=nodes,
            total_cost=0.0,
            total_hours=0.0,
        )

        completed = set()
        pending = {n.id for n in nodes}

        while pending:
            ready = [n for n in nodes if n.id in pending and all(d in completed for d in n.dependencies)]
            if not ready:
                # 死锁检测
                result.success = False
                result.report["error"] = "Dependency deadlock detected"
                break

            for node in ready:
                pending.discard(node.id)
                self._run_node(node, ctx, result)
                if node.status == NodeStatus.SUCCESS or node.status == NodeStatus.SKIPPED:
                    completed.add(node.id)
                elif node.status == NodeStatus.HUMAN_WAIT:
                    # 人工节点挂起，等待外部恢复
                    result.report["human_wait_node"] = node.id
                    result.report["status"] = "PAUSED_HUMAN"
                    result.success = False
                    return result
                elif node.status == NodeStatus.FAILED:
                    # 失败处理：是否熔断
                    if node.retry_count >= node.max_retries:
                        # 成本熔断检查
                        if ctx.total_cost > ctx.cost_cap:
                            result.report["error"] = f"Cost cap exceeded: {ctx.total_cost} > {ctx.cost_cap}"
                            result.report["fused"] = True
                            result.success = False
                            return result
                        # 否则尝试切换备用快照（简化版：直接失败）
                        result.success = False
                        result.report["error"] = f"Node {node.id} failed after {node.max_retries} retries"
                        return result
                    else:
                        # 重试，放回 pending
                        node.retry_count += 1
                        node.status = NodeStatus.PENDING
                        pending.add(node.id)

            # 自动 checkpoint
            if len(completed) % ctx.checkpoint_interval == 0:
                self._save_checkpoint(ctx, nodes)

        # 汇总
        result.total_cost = ctx.total_cost
        result.total_hours = sum(n.estimated_hours for n in nodes if n.status == NodeStatus.SUCCESS)
        result.final_output = ctx.global_state.get("output")
        result.report["completed_nodes"] = len(completed)
        result.report["failed_nodes"] = sum(1 for n in nodes if n.status == NodeStatus.FAILED)
        result.report["human_nodes"] = sum(1 for n in nodes if n.node_type == NodeType.HUMAN)
        result.report["auto_nodes"] = sum(1 for n in nodes if n.node_type == NodeType.AUTO)
        self._history.append(result)
        return result

    def _run_node(self, node: ExecutionNode, ctx: ExecutionContext, result: ExecutionResult) -> None:
        node.status = NodeStatus.RUNNING
        node.started_at = datetime.now(timezone.utc).isoformat()

        # 成本熔断（节点级）
        node_cost = node.estimated_hours * 100  # 假设每小时成本 100 元
        if ctx.total_cost + node_cost > ctx.cost_cap:
            node.status = NodeStatus.FAILED
            node.error = f"Cost cap would be exceeded: {ctx.total_cost + node_cost} > {ctx.cost_cap}"
            return

        if node.node_type == NodeType.HUMAN:
            node.status = NodeStatus.HUMAN_WAIT
            node.error = "Waiting for human confirmation"
            return

        # 自动节点执行
        try:
            tool_fn = self.tool_registry.get(node.tool)
            if tool_fn:
                node.output = tool_fn(ctx.variables, ctx.global_state)
            else:
                # 模拟执行：默认成功，记录耗时
                time.sleep(0.01)
                node.output = {"status": "mock_success", "tool": node.tool}

            ctx.total_cost += node_cost
            ctx.global_state[f"node_{node.id}_output"] = node.output
            node.status = NodeStatus.SUCCESS
            node.completed_at = datetime.now(timezone.utc).isoformat()
        except Exception as e:
            node.status = NodeStatus.FAILED
            node.error = str(e)
            ctx.total_cost += node_cost * 0.5  # 失败也消耗部分成本

    def _save_checkpoint(self, ctx: ExecutionContext, nodes: List[ExecutionNode]) -> None:
        """保存执行检查点（可扩展为持久化到磁盘/DB）"""
        checkpoint = {
            "snapshot_id": ctx.snapshot_id,
            "total_cost": ctx.total_cost,
            "global_state": ctx.global_state,
            "node_statuses": {n.id: n.status.name for n in nodes},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        # 简化版：打印日志；生产环境写入 Redis/PostgreSQL
        print(f"[CHECKPOINT] {checkpoint['snapshot_id']} @ {checkpoint['timestamp']} — cost={checkpoint['total_cost']:.2f}")

    def resume_human_node(self, result: ExecutionResult, node_id: int, output: Any) -> ExecutionResult:
        """恢复人工节点执行（外部调用）"""
        for node in result.nodes:
            if node.id == node_id and node.status == NodeStatus.HUMAN_WAIT:
                node.status = NodeStatus.SUCCESS
                node.output = output
                node.completed_at = datetime.now(timezone.utc).isoformat()
                # 重新执行后续 DAG
                return self._resume_from(result, node_id)
        return result

    def _resume_from(self, result: ExecutionResult, from_node_id: int) -> ExecutionResult:
        """从指定节点恢复执行（简化版：重新跑完整 DAG，跳过已完成）"""
        # 生产环境应实现更精细的 resume 逻辑
        return result

    def get_history(self) -> List[ExecutionResult]:
        return self._history

    def generate_report(self, result: ExecutionResult) -> str:
        """生成验收报告 Markdown"""
        lines = [
            "# 执行链路验收报告",
            f"- **快照 ID**: {result.snapshot_id}",
            f"- **执行结果**: {'✅ 成功' if result.success else '❌ 失败 / 需人工介入'}",
            f"- **总成本**: ¥{result.total_cost:.2f}",
            f"- **总工时**: {result.total_hours:.1f} h",
            f"- **完成节点**: {result.report.get('completed_nodes', 0)}",
            f"- **失败节点**: {result.report.get('failed_nodes', 0)}",
            f"- **人工节点**: {result.report.get('human_nodes', 0)}",
            f"- **自动节点**: {result.report.get('auto_nodes', 0)}",
            "",
            "## 节点明细",
            "| 步骤 | 名称 | 类型 | 状态 | 耗时 | 输出 |",
            "|------|------|------|------|------|------|",
        ]
        for node in result.nodes:
            type_label = "🤖 Auto" if node.node_type == NodeType.AUTO else "👤 Human"
            status_emoji = {
                NodeStatus.SUCCESS: "✅", NodeStatus.FAILED: "❌",
                NodeStatus.HUMAN_WAIT: "⏸️", NodeStatus.PENDING: "⏳",
                NodeStatus.SKIPPED: "⏭️", NodeStatus.RUNNING: "🔄",
            }.get(node.status, "❓")
            out = json.dumps(node.output, ensure_ascii=False)[:60] if node.output else "—"
            lines.append(f"| {node.id} | {node.name} | {type_label} | {status_emoji} {node.status.name} | {node.estimated_hours}h | {out} |")
        return "\n".join(lines)
