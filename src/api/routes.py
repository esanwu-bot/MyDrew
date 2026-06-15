# routes.py — FastAPI Routes (Register, Search, Execute, Accept)
"""
Drew FastAPI — 为前端和第三方提供 REST 接口
- 与现有 Go 后端互补，专注商业层 API
- 生产环境可合并为统一网关，或保持微服务拆分
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.core.snapshot import SnapshotStore, BusinessSnapshot, Variable, Step, QACheck, Metrics
from src.core.executor import DAGExecutor
from src.core.matcher import SnapshotMatcher
from src.core.qa import QAAcceptanceEngine
from src.models.expectation_model import ExpectationModel


app = FastAPI(
    title="Drew Business API",
    version="0.3.0",
    description="MyDrew 商业层 API — 快照市场、执行链路、验收结算",
)

# CORS 配置从环境变量读取，生产环境禁止通配符
allow_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局单例（MVP 阶段；生产环境用连接池）
store = SnapshotStore()
matcher = SnapshotMatcher(store)
executor = DAGExecutor()
qa_engine = QAAcceptanceEngine()
model = ExpectationModel()

# 注册模拟工具（TODO: 替换为真实工具调用，使用 Adapter 模式抽象外部工具接口）
executor.register_tool("docker", lambda v, s: {"status": "container_running"})        # TODO: 集成 Docker SDK
executor.register_tool("shopify-cli", lambda v, s: {"status": "store_created"})      # TODO: 调用 Shopify Admin API
executor.register_tool("stripe-api", lambda v, s: {"status": "payment_configured"})  # TODO: 调用 Stripe SDK
executor.register_tool("human", lambda v, s: {"status": "human_assigned"})          # TODO: 接入任务调度系统（如 Asana/Jira）


# ======================== Pydantic Models ========================

class SnapshotIn(BaseModel):
    snapshot_id: str = Field(..., min_length=1)
    name: str
    version: str = "1.0.0"
    author: str = ""
    price: float = 0.0
    tags: List[str] = []
    variables: List[Dict[str, Any]] = []
    steps: List[Dict[str, Any]] = []
    qa: List[Dict[str, Any]] = []
    metrics: Dict[str, Any] = {}


class SearchQuery(BaseModel):
    query: str
    budget: Optional[float] = None
    tags: Optional[List[str]] = None
    limit: int = 10


class RunRequest(BaseModel):
    snapshot_id: str
    variables: Dict[str, Any] = {}


class QAConfirmRequest(BaseModel):
    order_id: str
    check_id: str
    passed: bool
    detail: str = ""


class ArbitrageRequest(BaseModel):
    order_id: str
    reason: str


class ArbitrageResolveRequest(BaseModel):
    order_id: str
    decision: str  # full_customer | full_craftsman | split
    craftsman_share: float = 0.5


class SimulationRequest(BaseModel):
    n_projects: int = 100
    avg_project_value: float = 5000.0
    r_reuse: float = 0.3
    s_enterprise: int = 10
    s_freelancer: int = 50
    n_arbitration: int = 5


# ======================== Routes ========================

@app.get("/health")
def health():
    return {"status": "ok", "service": "drew-business-api", "version": "0.3.0"}


@app.post("/api/v1/snapshots")
def create_snapshot(data: SnapshotIn):
    snap = BusinessSnapshot(
        snapshot_id=data.snapshot_id,
        name=data.name,
        version=data.version,
        author=data.author,
        price=data.price,
        tags=data.tags,
        variables=[Variable(**v) for v in data.variables],
        steps=[Step(**s) for s in data.steps],
        qa=[QACheck(**q) for q in data.qa],
        metrics=Metrics(**data.metrics),
    )
    store.save(snap)
    return {"snapshot_id": snap.snapshot_id, "cid": snap.cid(), "status": "registered"}


@app.get("/api/v1/snapshots")
def list_snapshots(
    tags: Optional[str] = Query(None, description="逗号分隔标签"),
    author: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    tag_list = tags.split(",") if tags else None
    snaps = store.list_all(tags=tag_list, author=author)[:limit]
    return {
        "total": len(snaps),
        "snapshots": [s.to_dict() for s in snaps],
    }


@app.get("/api/v1/snapshots/{snapshot_id}")
def get_snapshot(snapshot_id: str):
    snap = store.get(snapshot_id)
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snap.to_dict()


@app.post("/api/v1/search")
def search_snapshots(body: SearchQuery):
    results = matcher.match(
        demand_text=body.query,
        budget=body.budget,
        tags=body.tags,
        limit=body.limit,
    )
    return {
        "query": body.query,
        "total": len(results),
        "results": [
            {
                "snapshot_id": r.snapshot_id,
                "name": r.name,
                "author": r.author,
                "price": r.price,
                "final_score": r.final_score,
                "vector_score": r.vector_score,
                "business_score": r.business_score,
                "reuse_count": r.reuse_count,
                "satisfaction": r.satisfaction,
                "avg_delivery_days": r.avg_delivery_days,
                "tags": r.tags,
                "matched_tags": r.matched_tags,
                "price_fit": r.price_fit,
            }
            for r in results
        ],
    }


@app.post("/api/v1/execute")
def execute_snapshot(body: RunRequest):
    snap = store.get(body.snapshot_id)
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    result = executor.execute(snap, variables=body.variables)
    return {
        "snapshot_id": body.snapshot_id,
        "success": result.success,
        "total_cost": result.total_cost,
        "total_hours": result.total_hours,
        "nodes": [
            {
                "id": n.id,
                "name": n.name,
                "type": n.node_type.name,
                "status": n.status.name,
                "estimated_hours": n.estimated_hours,
                "output": n.output,
                "error": n.error,
            }
            for n in result.nodes
        ],
        "report": result.report,
        "final_output": result.final_output,
    }


@app.post("/api/v1/qa/run")
def run_qa(snap_id: str, order_id: str):
    snap = store.get(snap_id)
    if not snap:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    # 模拟执行结果
    mock_exec = {"status": "mock"}
    report = qa_engine.run_acceptance(snap, order_id, mock_exec)
    return {
        "order_id": order_id,
        "snapshot_id": snap_id,
        "overall": report.overall.name,
        "final_score": report.final_score,
        "items": [
            {
                "check_name": i.check_name,
                "method": i.method.name,
                "result": i.result.name,
                "detail": i.detail,
            }
            for i in report.items
        ],
        "settlement": {
            "refund": report.refund_amount,
            "platform": report.platform_deduction,
            "craftsman": report.craftsman_payout,
        },
    }


@app.post("/api/v1/qa/confirm")
def confirm_qa(body: QAConfirmRequest):
    # 简化：直接返回成功（生产环境需持久化 report 对象）
    return {"order_id": body.order_id, "check_id": body.check_id, "confirmed": body.passed}


@app.post("/api/v1/qa/arbitration")
def escalate_arbitration(body: ArbitrageRequest):
    return {"order_id": body.order_id, "status": "DISPUTE", "reason": body.reason, "fee": 50.0}


@app.post("/api/v1/qa/resolve")
def resolve_arbitration(body: ArbitrageResolveRequest):
    return {
        "order_id": body.order_id,
        "decision": body.decision,
        "craftsman_share": body.craftsman_share,
        "status": "resolved",
    }


@app.post("/api/v1/simulate")
def simulate_revenue(body: SimulationRequest):
    scenario = model.simulate(
        n_projects=body.n_projects,
        avg_project_value=body.avg_project_value,
        r_reuse=body.r_reuse,
        s_enterprise=body.s_enterprise,
        s_freelancer=body.s_freelancer,
        n_arbitration=body.n_arbitration,
    )
    return scenario


@app.get("/api/v1/stats")
def platform_stats():
    stats = store.stats()
    scenario = model.simulate(
        n_projects=stats.get("total_reuse", 0) + 100,
        avg_project_value=stats.get("avg_price", 5000) * 2,
    )
    return {
        "snapshots": stats,
        "revenue_forecast": {
            "platform_monthly": scenario["platform_revenue"],
            "freelancer_monthly": scenario["freelancer_revenue"],
        },
    }
