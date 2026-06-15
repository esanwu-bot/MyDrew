import { useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  Search, FileText, ArrowRight, Clock, Tag, Filter,
  ChevronDown, ChevronUp, X
} from 'lucide-react'

export default function RequirementsHall() {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: requirements, isLoading } = trpc.requirement.list.useQuery()
  const { data: categories } = trpc.category.list.useQuery()

  const filtered = (requirements || []).filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        req.title.toLowerCase().includes(q) ||
        req.description.toLowerCase().includes(q)
      )
    }
    return true
  })

  const statusLabel: Record<string, string> = {
    open: '开放中',
    in_progress: '进行中',
    completed: '已完成',
    closed: '已关闭',
  }

  const statusColor: Record<string, string> = {
    open: 'bg-emerald-500/10 text-emerald-400',
    in_progress: 'bg-blue-500/10 text-blue-400',
    completed: 'bg-neutral-500/10 text-neutral-400',
    closed: 'bg-red-500/10 text-red-400',
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            需求<span className="text-gradient">大厅</span>
          </h1>
          <p className="text-neutral-500">
            浏览企业发布的项目需求，找到适合您的项目接单
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Search className="w-5 h-5 text-neutral-500 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索需求..."
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-neutral-600"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-neutral-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl border transition-all ${
                showFilters
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-white/10 bg-white/5 text-neutral-400 hover:text-white'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-[#111] border border-white/5">
              {['all', 'open', 'in_progress', 'completed', 'closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === s
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {s === 'all' ? '全部' : statusLabel[s]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-500">
            共找到 <span className="text-amber-400 font-medium">{filtered.length}</span> 个需求
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#111] border border-white/5 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
                <div className="h-3 bg-white/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((req) => (
              <div
                key={req.id}
                className="p-5 sm:p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-500/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusColor[req.status] || statusColor.open}`}>
                        {statusLabel[req.status] || req.status}
                      </span>
                      <span className="text-xs text-neutral-500">{req.categoryName}</span>
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-2">{req.title}</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 mb-3">
                      {req.description}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] text-neutral-600">
                      {req.budgetFrom && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          预算 &yen;{Number(req.budgetFrom).toLocaleString()}
                          {req.budgetTo && ` - ${Number(req.budgetTo).toLocaleString()}`}
                        </span>
                      )}
                      {req.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {req.deadline}
                        </span>
                      )}
                      <span>{req.createdAt ? new Date(req.createdAt).toLocaleDateString('zh-CN') : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <Link
                      to={`/smart-match?req=${encodeURIComponent(req.title + ' ' + req.description)}`}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-xs hover:from-amber-400 hover:to-amber-500 transition-all flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Drew 匹配
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">暂无需求</h3>
            <p className="text-sm text-neutral-500">
              {search ? '尝试其他搜索词' : '还没有人发布需求'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
