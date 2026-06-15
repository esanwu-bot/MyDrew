import { useState } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import {
  Target, ArrowRight, Star, Shield, Clock, Zap,
  Loader2, AlertCircle, Search, SlidersHorizontal
} from 'lucide-react'

export default function SmartMatch() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [query, setQuery] = useState('')
  const [budget, setBudget] = useState('')
  const [tags, setTags] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const {
    data: matchResult,
    isLoading,
    error,
  } = trpc.drew.search.useQuery(
    {
      query,
      budget: budget ? Number(budget) : undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      limit: 10,
    },
    { enabled: hasSearched }
  )

  const handleSearch = () => {
    if (!query.trim()) return
    setHasSearched(true)
  }

  const handleOrder = (snapshotId: string, name: string, price: number) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    // TODO: 创建订单时关联 Drew 快照
    navigate('/orders')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Drew <span className="text-gradient">智能匹配</span>
          </h1>
          <p className="text-neutral-500">
            输入您的项目需求，Drew 引擎将基于语义相似度和商业信誉为您推荐最优服务快照
          </p>
        </div>

        {/* Search Form */}
        <div className="p-6 rounded-2xl bg-[#111] border border-white/5 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-neutral-500 mb-1.5">需求描述</label>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-amber-500/50 transition-all">
                <Search className="w-5 h-5 text-neutral-500 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="例如：需要一个跨境电商独立站，支持 Shopify + Stripe 支付..."
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-neutral-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">预算上限</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">&yen;</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="10000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-neutral-500 mb-1.5">标签过滤</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="电商, Shopify, 海外支付（逗号分隔）"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-sm hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {isLoading ? '匹配中...' : '智能匹配'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4" />
            Drew 引擎连接失败：{error.message}
          </div>
        )}

        {/* Results */}
        {hasSearched && matchResult && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-neutral-500">
                为 <span className="text-amber-400">"{query}"</span> 匹配到{' '}
                <span className="text-amber-400 font-medium">{matchResult.total || 0}</span> 个快照
              </p>
            </div>

            <div className="space-y-4">
              {(matchResult.results || []).map((r: any, idx: number) => {
                const scoreColor = r.final_score >= 0.8 ? 'text-emerald-400' : r.final_score >= 0.6 ? 'text-amber-400' : 'text-neutral-400'
                const scoreBg = r.final_score >= 0.8 ? 'bg-emerald-500/10' : r.final_score >= 0.6 ? 'bg-amber-500/10' : 'bg-white/5'

                return (
                  <div
                    key={idx}
                    className="p-5 sm:p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-500/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Score Ring */}
                      <div className={`w-16 h-16 rounded-full ${scoreBg} flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-lg font-bold font-mono ${scoreColor}`}>
                          {(r.final_score * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-white text-base mb-1">
                              {idx + 1}. {r.name}
                            </h3>
                            <p className="text-xs text-neutral-500">
                              作者: {r.author} | 复用 {r.reuse_count} 次 | 满意度 {(r.satisfaction * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-amber-400">&yen;{r.price.toLocaleString()}</p>
                            <p className="text-[10px] text-neutral-500">交付 {r.avg_delivery_days.toFixed(1)} 天</p>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(r.tags || []).map((t: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-white/5 text-neutral-400 text-[10px]">
                              {t}
                            </span>
                          ))}
                          {(r.matched_tags || []).map((t: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">
                              {t}
                            </span>
                          ))}
                        </div>

                        {/* Explain */}
                        <div className="mt-3 p-3 rounded-lg bg-white/5 text-xs text-neutral-500 leading-relaxed">
                          综合得分 <b className="text-white">{r.final_score.toFixed(3)}</b> = 语义相似度{' '}
                          {r.vector_score.toFixed(2)} × 40% + 商业信誉分 {r.business_score.toFixed(2)} × 60%
                          {r.price_fit && (
                            <span> | 价格适配度: {(r.price_fit * 100).toFixed(0)}%</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-4">
                          <button
                            onClick={() => handleOrder(r.snapshot_id, r.name, r.price)}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-xs hover:from-amber-400 hover:to-amber-500 transition-all"
                          >
                            立即下单
                          </button>
                          <button
                            onClick={() => navigate(`/service/${r.snapshot_id}`)}
                            className="px-4 py-2 rounded-lg border border-white/10 text-xs text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 transition-all"
                          >
                            查看详情
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {(matchResult.results || []).length === 0 && !isLoading && (
                <div className="text-center py-16">
                  <Target className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">未找到匹配快照</h3>
                  <p className="text-sm text-neutral-500">请尝试调整需求描述或预算</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
