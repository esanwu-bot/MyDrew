# snapshot.py — Snapshot CRUD + Version Management (Business Layer)
"""
Drew Snapshot Engine — 商业层快照管理
兼容现有 .amd 格式，同时支持 drew-snapshot-schema.yaml 商业字段
"""

from __future__ import annotations

import json
import hashlib
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, List, Dict
from dataclasses import dataclass, field, asdict


@dataclass
class Variable:
    name: str
    type: str = "string"
    options: List[str] = field(default_factory=list)
    default: Any = None


@dataclass
class Step:
    id: int
    name: str
    tool: str = "human"
    auto: bool = False
    estimated_hours: float = 0.0
    dependencies: List[int] = field(default_factory=list)


@dataclass
class QACheck:
    check: str
    method: str = "auto"  # auto | manual
    passed: Optional[bool] = None


@dataclass
class Metrics:
    reuse_count: int = 0
    avg_delivery_days: float = 0.0
    satisfaction: float = 0.0
    refund_rate: float = 0.0


@dataclass
class BusinessSnapshot:
    """商业快照 Schema（drew-snapshot-schema.yaml 兼容）"""
    snapshot_id: str
    name: str
    version: str = "1.0.0"
    author: str = ""
    price: float = 0.0
    tags: List[str] = field(default_factory=list)
    variables: List[Variable] = field(default_factory=list)
    steps: List[Step] = field(default_factory=list)
    qa: List[QACheck] = field(default_factory=list)
    metrics: Metrics = field(default_factory=Metrics)
    raw_amd: str = ""  # 原始 .amd 内容（可选）
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # 递归清理 dataclass 类型
        return json.loads(json.dumps(d, default=str))

    def cid(self) -> str:
        """内容哈希生成 CID（兼容 Drew Hash DNS）"""
        content = json.dumps(self.to_dict(), sort_keys=True, ensure_ascii=False)
        return "bafybe" + hashlib.sha256(content.encode()).hexdigest()[:40]

    def version_bump(self, bump_type: str = "patch") -> "BusinessSnapshot":
        """语义化版本升级"""
        major, minor, patch = map(int, self.version.split("."))
        if bump_type == "major":
            major, minor, patch = major + 1, 0, 0
        elif bump_type == "minor":
            minor, patch = minor + 1, 0
        else:
            patch += 1
        self.version = f"{major}.{minor}.{patch}"
        self.updated_at = datetime.now(timezone.utc).isoformat()
        return self


class SnapshotStore:
    """本地 JSON 快照存储（MVP 阶段）→ 可替换为 PostgreSQL/Qdrant 后端"""

    def __init__(self, data_dir: str = "./data/snapshots"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[str, BusinessSnapshot] = {}
        self._load_all()

    def _load_all(self) -> None:
        for f in self.data_dir.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                snap = self._dict_to_snapshot(data)
                self._cache[snap.snapshot_id] = snap
            except Exception as e:
                print(f"[WARN] Failed to load {f}: {e}")

    def _dict_to_snapshot(self, d: Dict) -> BusinessSnapshot:
        """从字典反序列化快照"""
        variables = [Variable(**v) for v in d.get("variables", [])]
        steps = [Step(**s) for s in d.get("steps", [])]
        qa = [QACheck(**q) for q in d.get("qa", [])]
        metrics = Metrics(**d.get("metrics", {}))
        d = {k: v for k, v in d.items() if k not in ("variables", "steps", "qa", "metrics")}
        return BusinessSnapshot(
            **d,
            variables=variables,
            steps=steps,
            qa=qa,
            metrics=metrics,
        )

    def _path(self, snapshot_id: str) -> Path:
        return self.data_dir / f"{snapshot_id}.json"

    def save(self, snap: BusinessSnapshot) -> None:
        path = self._path(snap.snapshot_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(snap.to_dict(), f, ensure_ascii=False, indent=2)
        self._cache[snap.snapshot_id] = snap

    def get(self, snapshot_id: str) -> Optional[BusinessSnapshot]:
        return self._cache.get(snapshot_id)

    def list_all(self, tags: Optional[List[str]] = None, author: Optional[str] = None) -> List[BusinessSnapshot]:
        results = list(self._cache.values())
        if tags:
            tag_set = set(tags)
            results = [s for s in results if tag_set & set(s.tags)]
        if author:
            results = [s for s in results if s.author == author]
        return sorted(results, key=lambda x: x.metrics.reuse_count, reverse=True)

    def delete(self, snapshot_id: str) -> bool:
        if snapshot_id in self._cache:
            del self._cache[snapshot_id]
            self._path(snapshot_id).unlink(missing_ok=True)
            return True
        return False

    def search(self, query: str) -> List[BusinessSnapshot]:
        """简单本地搜索（关键词匹配）→ 生产环境应调用 Qdrant 向量搜索"""
        query_lower = query.lower()
        results = []
        for snap in self._cache.values():
            score = 0
            text = f"{snap.name} {' '.join(snap.tags)}"
            if query_lower in text.lower():
                score += 1.0
            for step in snap.steps:
                if query_lower in step.name.lower():
                    score += 0.3
            if score > 0:
                results.append((score, snap))
        results.sort(key=lambda x: x[0], reverse=True)
        return [s for _, s in results]

    def clone(self, snapshot_id: str, new_author: str, new_id: Optional[str] = None) -> Optional[BusinessSnapshot]:
        """克隆快照（分支机制）"""
        base = self.get(snapshot_id)
        if not base:
            return None
        cloned = BusinessSnapshot(
            snapshot_id=new_id or f"{snapshot_id}-branch-{datetime.now().strftime('%Y%m%d')}",
            name=base.name + " (Branch)",
            version="1.0.0",
            author=new_author,
            price=base.price,
            tags=base.tags.copy(),
            variables=[Variable(**asdict(v)) for v in base.variables],
            steps=[Step(**asdict(s)) for s in base.steps],
            qa=[QACheck(**asdict(q)) for q in base.qa],
            metrics=Metrics(),  # 新分支从零开始
        )
        self.save(cloned)
        return cloned

    def record_reuse(self, snapshot_id: str, success: bool = True, delivery_days: Optional[float] = None) -> None:
        """记录快照复用事件，更新 metrics"""
        snap = self.get(snapshot_id)
        if not snap:
            return
        snap.metrics.reuse_count += 1
        if delivery_days is not None:
            # 滚动平均更新交付天数
            n = snap.metrics.reuse_count
            old_avg = snap.metrics.avg_delivery_days
            snap.metrics.avg_delivery_days = (old_avg * (n - 1) + delivery_days) / n
        if not success:
            snap.metrics.refund_rate = ((snap.metrics.refund_rate * (n - 1)) + 1.0) / n
        snap.metrics.satisfaction = max(0.0, 1.0 - snap.metrics.refund_rate)
        self.save(snap)

    def stats(self) -> Dict[str, Any]:
        """平台快照统计"""
        snaps = list(self._cache.values())
        total = len(snaps)
        total_reuse = sum(s.metrics.reuse_count for s in snaps)
        avg_price = sum(s.price for s in snaps) / total if total else 0
        avg_satisfaction = sum(s.metrics.satisfaction for s in snaps) / total if total else 0
        return {
            "total_snapshots": total,
            "total_reuse": total_reuse,
            "avg_price": round(avg_price, 2),
            "avg_satisfaction": round(avg_satisfaction, 3),
            "top_tags": self._top_tags(10),
        }

    def _top_tags(self, n: int) -> List[tuple]:
        from collections import Counter
        tags = []
        for s in self._cache.values():
            tags.extend(s.tags)
        return Counter(tags).most_common(n)
