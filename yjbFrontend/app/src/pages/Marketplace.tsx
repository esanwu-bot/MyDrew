import { useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  Search, Star, Shield, Clock, SlidersHorizontal, X,
  Code2, Palette, TrendingUp, Lightbulb, Brain, Clapperboard
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Code2: <Code2 className="w-4 h-4" />,
  Palette: <Palette className="w-4 h-4" />,
  TrendingUp: <TrendingUp className="w-4 h-4" />,
  Lightbulb: <Lightbulb className="w-4 h-4" />,
  Brain: <Brain className="w-4 h-4" />,
  Clapperboard: <Clapperboard className="w-4 h-4" />,
}

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()
  const [showFilters, setShowFilters] = useState(false)

  const { data: categories } = trpc.category.list.useQuery()
  const { data: services, isLoading } = trpc.service.list.useQuery({
    categoryId: selectedCategory,
    search: searchQuery || undefined,
  })

  const handleSearch = () => {
    // Search is reactive via the query
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            服务<span className="text-gradient">市场</span>
          </h1>
          <p className="text-neutral-500">
            浏览平台认证服务商提供的专业解决方案
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3 focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all">
              <Search className="w-5 h-5 text-neutral-500 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索服务..."
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-neutral-600"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-neutral-500 hover:text-white">
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
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !selectedCategory
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              全部
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                {CATEGORY_ICONS[cat.icon || '']}
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-500">
            共找到 <span className="text-amber-400 font-medium">{services?.length || 0}</span> 个服务
          </p>
        </div>

        {/* Service Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#111] border border-white/5 animate-pulse">
                <div className="h-12 w-12 rounded-xl bg-white/5 mb-4" />
                <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/5 rounded w-full mb-4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : services && services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((svc) => (
              <Link
                key={svc.id}
                to={`/service/${svc.slug}`}
                className="group p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 card-glow"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-600/10 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-medium">
                        {svc.categoryName}
                      </span>
                      {svc.featured === 1 && (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-medium">
                          精选
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-amber-400 transition-colors line-clamp-2">
                      {svc.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 leading-relaxed mb-4 line-clamp-2">
                  {svc.summary}
                </p>

                {/* Tags */}
                {svc.tags && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {JSON.parse(svc.tags as string).slice(0, 3).map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-white/5 text-neutral-500 text-[10px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-neutral-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" />
                    {svc.providerRating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {svc.deliveryDays}天
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                      {svc.providerName?.charAt(0) || 'S'}
                    </div>
                    <span className="text-xs text-neutral-400">{svc.providerName}</span>
                    {svc.providerVerified === 1 && (
                      <Shield className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-amber-400">
                    &yen;{Number(svc.priceFrom).toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">未找到相关服务</h3>
            <p className="text-sm text-neutral-500">请尝试其他关键词或分类</p>
          </div>
        )}
      </div>
    </div>
  )
}
