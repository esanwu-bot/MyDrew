# matcher.py — Vector Similarity Matching (Demand ↔ Craftsman Snapshot)
"""
Drew Matcher — 向量相似度匹配引擎
- 需求快照（企业 RFP） ↔ 工匠快照（服务商品）
- 支持混合评分：语义相似度 + 商业指标 + 工匠信誉
- 生产环境调用 Qdrant/Go 搜索 API；MVP 支持本地降级搜索
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from .snapshot import SnapshotStore, BusinessSnapshot


@dataclass
class MatchResult:
    snapshot_id: str
    name: str
    author: str
    price: float
    vector_score: float
    business_score: float
    final_score: float
    tags: List[str]
    reuse_count: int
    satisfaction: float
    avg_delivery_days: float
    matched_tags: List[str] = None
    price_fit: float = 0.0  # 价格匹配度（预算适配）


class SnapshotMatcher:
    """需求快照 ↔ 工匠快照 匹配引擎"""

    def __init__(self, store: SnapshotStore, qdrant_url: Optional[str] = None):
        self.store = store
        self.qdrant_url = qdrant_url  # 可选：生产环境接入 Qdrant

    def match(
        self,
        demand_text: str,
        budget: Optional[float] = None,
        tags: Optional[List[str]] = None,
        limit: int = 10,
    ) -> List[MatchResult]:
        """
        匹配流程：
        1. 向量检索（语义相似度）
        2. 标量过滤（预算、标签）
        3. 商业评分（信誉、交付速度、复用率）
        4. 加权排序（AgentRank 商业版）
        """
        # Step 1: 候选召回（本地搜索或 Qdrant）
        candidates = self._recall_candidates(demand_text, tags, limit * 3)
        if not candidates:
            return []

        # Step 2: 标量过滤
        filtered = self._scalar_filter(candidates, budget, tags)

        # Step 3: 评分与排序
        results = []
        for snap in filtered:
            vec_score = self._semantic_score(demand_text, snap)
            biz_score = self._business_score(snap, budget)
            final_score = self._blend_score(vec_score, biz_score)

            matched_tags = list(set(snap.tags) & set(tags or []))
            price_fit = self._price_fit(budget, snap.price) if budget else 0.5

            results.append(MatchResult(
                snapshot_id=snap.snapshot_id,
                name=snap.name,
                author=snap.author,
                price=snap.price,
                vector_score=vec_score,
                business_score=biz_score,
                final_score=final_score,
                tags=snap.tags,
                reuse_count=snap.metrics.reuse_count,
                satisfaction=snap.metrics.satisfaction,
                avg_delivery_days=snap.metrics.avg_delivery_days,
                matched_tags=matched_tags,
                price_fit=price_fit,
            ))

        results.sort(key=lambda x: x.final_score, reverse=True)
        return results[:limit]

    def _recall_candidates(self, query: str, tags: Optional[List[str]], limit: int) -> List[BusinessSnapshot]:
        """召回候选（本地关键词搜索或 Qdrant 向量搜索）"""
        if self.qdrant_url:
            # 生产环境：调用 Qdrant / Go 搜索 API
            return self._qdrant_search(query, tags, limit)
        # MVP 降级：本地关键词搜索
        return self.store.search(query)[:limit]

    def _qdrant_search(self, query: str, tags: Optional[List[str]], limit: int) -> List[BusinessSnapshot]:
        """调用 Qdrant/Go API 进行向量搜索（简化版）"""
        # 实际实现应调用 Go 后端 /api/v1/search
        # 此处返回本地全部，由标量过滤处理
        return self.store.list_all(tags=tags)[:limit]

    def _scalar_filter(self, candidates: List[BusinessSnapshot], budget: Optional[float], tags: Optional[List[str]]) -> List[BusinessSnapshot]:
        """标量过滤：预算、标签等硬性约束"""
        results = []
        for snap in candidates:
            if budget is not None and snap.price > budget * 1.5:
                # 价格超出预算 50% 以上直接过滤
                continue
            if tags and not (set(tags) & set(snap.tags)):
                # 无标签交集，相关性过低
                continue
            results.append(snap)
        return results

    def _semantic_score(self, query: str, snap: BusinessSnapshot) -> float:
        """语义相似度（简化版：关键词重叠 + Jaccard）"""
        query_tokens = set(query.lower().split())
        snap_text = f"{snap.name} {' '.join(snap.tags)}"
        snap_tokens = set(snap_text.lower().split())
        if not query_tokens or not snap_tokens:
            return 0.0
        intersection = len(query_tokens & snap_tokens)
        union = len(query_tokens | snap_tokens)
        jaccard = intersection / union if union > 0 else 0.0
        # 生产环境应替换为真实向量余弦相似度
        return min(1.0, jaccard * 3.0)  # 放大因子模拟向量密度

    def _business_score(self, snap: BusinessSnapshot, budget: Optional[float]) -> float:
        """商业评分：信誉、交付速度、复用率、满意度"""
        # 复用率（对数归一化）
        reuse = math.log10(snap.metrics.reuse_count + 1) / 3.0
        # 满意度
        sat = snap.metrics.satisfaction
        # 交付速度（天数越少越好，>10 天开始扣分）
        days = snap.metrics.avg_delivery_days
        speed = max(0.0, 1.0 - (days / 10.0))
        # 价格竞争力（价格越低竞争力越高，但太低可能质量差）
        price_score = 0.5  # 中性
        if budget and snap.price > 0:
            ratio = snap.price / budget
            if 0.5 <= ratio <= 1.0:
                price_score = 1.0
            elif ratio < 0.5:
                price_score = 0.7  # 过低可能风险
            else:
                price_score = max(0.0, 1.0 - (ratio - 1.0) * 2)

        # 加权
        return (
            reuse * 0.25 +
            sat * 0.35 +
            speed * 0.20 +
            price_score * 0.20
        )

    def _blend_score(self, vector_score: float, business_score: float) -> float:
        """最终混合分 = 语义 40% + 商业 60%"""
        return vector_score * 0.40 + business_score * 0.60

    def _price_fit(self, budget: float, price: float) -> float:
        """价格适配度：0-1"""
        if price <= 0:
            return 0.5
        ratio = price / budget
        if ratio <= 1.0:
            return 1.0 - (ratio - 0.5) * 0.4  # 0.5-1.0 之间，越接近预算越适配
        return max(0.0, 1.0 - (ratio - 1.0) * 1.5)

    def explain_match(self, result: MatchResult) -> str:
        """生成匹配结果的可解释报告"""
        return (
            f"**{result.name}** (by {result.author})\n"
            f"- 综合得分: {result.final_score:.3f}\n"
            f"  - 语义相似度: {result.vector_score:.3f} (40%)\n"
            f"  - 商业信誉分: {result.business_score:.3f} (60%)\n"
            f"- 报价: ¥{result.price:,.0f} (预算适配度: {result.price_fit:.2f})\n"
            f"- 历史复用: {result.reuse_count} 次 | 满意度: {result.satisfaction:.0%}\n"
            f"- 平均交付: {result.avg_delivery_days:.1f} 天\n"
            f"- 匹配标签: {', '.join(result.matched_tags or [])}"
        )
