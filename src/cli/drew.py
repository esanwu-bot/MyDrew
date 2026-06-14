#!/usr/bin/env python3
# drew.py — CLI Tool (init, register, search, run, clone)
"""
Drew CLI — 工匠与企业管理命令行工具
Usage:
  drew init <project_name>          初始化项目
  drew register <file.yaml>         注册快照到平台
 drew search <query> [--budget=]   搜索匹配快照
  drew run <snapshot_id>            执行快照链路
  drew clone <snapshot_id>          克隆快照为个人分支
  drew stats                        查看平台统计
  drew version                      查看版本
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

# 将项目根目录加入路径
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.core.snapshot import SnapshotStore, BusinessSnapshot, Variable, Step, QACheck, Metrics
from src.core.executor import DAGExecutor
from src.core.matcher import SnapshotMatcher
from src.core.qa import QAAcceptanceEngine
from src.models.expectation_model import ExpectationModel


def cmd_init(args) -> None:
    """初始化项目目录"""
    project_name = args.project_name
    project_dir = Path(f"./{project_name}")
    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / "snapshots").mkdir(exist_ok=True)
    (project_dir / "data").mkdir(exist_ok=True)
    
    # 写入模板快照
    template = project_dir / "snapshots" / "template.yaml"
    template.write_text("""---
snapshot_id: "template-001"
name: "我的服务快照"
version: "1.0.0"
author: "工匠_未知"
price: 5000
tags: ["模板", "服务"]
variables:
  - name: platform
    type: enum
    options: [Shopify, WordPress]
    default: Shopify
steps:
  - id: 1
    name: "需求分析"
    tool: "human"
    auto: false
    estimated_hours: 4
  - id: 2
    name: "自动部署"
    tool: "docker"
    auto: true
    estimated_hours: 2
qa:
  - check: "功能完整性检查"
    method: "auto"
metrics:
  reuse_count: 0
  avg_delivery_days: 3
  satisfaction: 0.95
""", encoding="utf-8")
    
    print(f"✅ 项目 '{project_name}' 初始化完成")
    print(f"   目录: {project_dir.resolve()}")
    print(f"   模板快照: {template}")


def cmd_register(args) -> None:
    """注册快照到平台"""
    import yaml
    store = SnapshotStore()
    file_path = Path(args.file)
    
    if not file_path.exists():
        print(f"❌ 文件不存在: {file_path}")
        sys.exit(1)
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    
    # 构造快照对象
    snap = BusinessSnapshot(
        snapshot_id=data.get("snapshot_id", f"reg-{file_path.stem}"),
        name=data.get("name", "未命名"),
        version=data.get("version", "1.0.0"),
        author=data.get("author", "匿名"),
        price=float(data.get("price", 0)),
        tags=data.get("tags", []),
        variables=[Variable(**v) for v in data.get("variables", [])],
        steps=[Step(**s) for s in data.get("steps", [])],
        qa=[QACheck(**q) for q in data.get("qa", [])],
        metrics=Metrics(**data.get("metrics", {})),
    )
    
    store.save(snap)
    print(f"✅ 快照已注册: {snap.snapshot_id}")
    print(f"   名称: {snap.name}")
    print(f"   报价: ¥{snap.price:,.0f}")
    print(f"   CID: {snap.cid()}")


def cmd_search(args) -> None:
    """搜索匹配快照"""
    store = SnapshotStore()
    matcher = SnapshotMatcher(store)
    
    results = matcher.match(
        demand_text=args.query,
        budget=args.budget,
        tags=args.tags.split(",") if args.tags else None,
        limit=args.limit,
    )
    
    if not results:
        print("🔍 未找到匹配的快照")
        return
    
    print(f"🔍 找到 {len(results)} 个匹配快照:\n")
    for i, r in enumerate(results, 1):
        print(f"  {i}. {r.name}")
        print(f"     作者: {r.author} | 报价: ¥{r.price:,.0f}")
        print(f"     综合得分: {r.final_score:.3f} (语义: {r.vector_score:.2f} | 商业: {r.business_score:.2f})")
        print(f"     复用: {r.reuse_count} 次 | 满意度: {r.satisfaction:.0%} | 交付: {r.avg_delivery_days:.1f} 天")
        print(f"     标签: {', '.join(r.tags)}")
        print()


def cmd_run(args) -> None:
    """执行快照链路"""
    store = SnapshotStore()
    snap = store.get(args.snapshot_id)
    if not snap:
        print(f"❌ 快照未找到: {args.snapshot_id}")
        sys.exit(1)
    
    executor = DAGExecutor()
    # 注册一些模拟工具
    executor.register_tool("docker", lambda v, s: {"status": "container_running", "id": "abc123"})
    executor.register_tool("shopify-cli", lambda v, s: {"status": "store_created", "url": "https://example.myshopify.com"})
    executor.register_tool("stripe-api", lambda v, s: {"status": "payment_configured", "mode": "live"})
    
    variables = {}
    if args.vars:
        for pair in args.vars.split(","):
            k, v = pair.split("=", 1)
            variables[k.strip()] = v.strip()
    
    result = executor.execute(snap, variables=variables)
    
    print(f"{'='*60}")
    print(executor.generate_report(result))
    print(f"{'='*60}")
    
    if not result.success:
        print("⚠️ 执行未完成，可能需要人工介入或重试")
        sys.exit(1)


def cmd_clone(args) -> None:
    """克隆快照为个人分支"""
    store = SnapshotStore()
    cloned = store.clone(args.snapshot_id, new_author=args.author or "anonymous")
    if cloned:
        print(f"✅ 已克隆: {cloned.snapshot_id}")
        print(f"   原快照: {args.snapshot_id}")
        print(f"   新分支: {cloned.name}")
    else:
        print(f"❌ 原快照未找到: {args.snapshot_id}")
        sys.exit(1)


def cmd_stats(args) -> None:
    """查看平台统计"""
    store = SnapshotStore()
    stats = store.stats()
    
    print("📊 Drew 平台统计")
    print(f"   总快照数: {stats['total_snapshots']}")
    print(f"   总复用次数: {stats['total_reuse']}")
    print(f"   平均报价: ¥{stats['avg_price']:,.0f}")
    print(f"   平均满意度: {stats['avg_satisfaction']:.1%}")
    print("   热门标签:")
    for tag, count in stats.get("top_tags", []):
        print(f"      - {tag}: {count}")
    
    # 数学期望模拟
    model = ExpectationModel()
    scenario = model.simulate(
        n_projects=stats['total_reuse'] + 100,
        avg_project_value=stats['avg_price'] * 2,
        r_reuse=0.3,
        s_enterprise=10,
        s_freelancer=50,
        n_arbitration=5,
    )
    print("\n💰 月度期望收入模拟（基于当前平台数据）:")
    print(f"   平台期望收入: ¥{scenario['platform_revenue']:,.0f}")
    print(f"   工匠期望收入: ¥{scenario['freelancer_revenue']:,.0f}")


def cmd_version(args) -> None:
    print("Drew CLI v0.3.0 — MyDrew 智能体执行链路引擎")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="drew",
        description="Drew — 智能体执行链路引擎 CLI",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    
    # init
    p_init = sub.add_parser("init", help="初始化项目")
    p_init.add_argument("project_name", help="项目名称")
    p_init.set_defaults(func=cmd_init)
    
    # register
    p_reg = sub.add_parser("register", help="注册快照")
    p_reg.add_argument("file", help="YAML 快照文件路径")
    p_reg.set_defaults(func=cmd_register)
    
    # search
    p_search = sub.add_parser("search", help="搜索快照")
    p_search.add_argument("query", help="需求描述")
    p_search.add_argument("--budget", type=float, default=None, help="预算上限")
    p_search.add_argument("--tags", type=str, default=None, help="标签过滤（逗号分隔）")
    p_search.add_argument("--limit", type=int, default=10, help="返回数量")
    p_search.set_defaults(func=cmd_search)
    
    # run
    p_run = sub.add_parser("run", help="执行快照")
    p_run.add_argument("snapshot_id", help="快照 ID")
    p_run.add_argument("--vars", type=str, default=None, help="变量（k1=v1,k2=v2）")
    p_run.set_defaults(func=cmd_run)
    
    # clone
    p_clone = sub.add_parser("clone", help="克隆快照")
    p_clone.add_argument("snapshot_id", help="原快照 ID")
    p_clone.add_argument("--author", type=str, default=None, help="新作者")
    p_clone.set_defaults(func=cmd_clone)
    
    # stats
    p_stats = sub.add_parser("stats", help="平台统计")
    p_stats.set_defaults(func=cmd_stats)
    
    # version
    p_ver = sub.add_parser("version", help="查看版本")
    p_ver.set_defaults(func=cmd_version)
    
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
