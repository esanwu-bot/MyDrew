import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import {
  Star, Shield, Clock, Check, ArrowLeft, MessageCircle,
  ShoppingCart, ChevronDown, ChevronUp, AlertCircle, X
} from 'lucide-react'

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')

  const { data: service, isLoading } = trpc.service.bySlug.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  )

  const createOrder = trpc.order.create.useMutation({
    onSuccess: () => {
      setShowOrderModal(false)
      navigate('/orders')
    },
  })

  const handleOrder = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setShowOrderModal(true)
  }

  const handleSubmitOrder = () => {
    if (!service) return
    createOrder.mutate({
      serviceId: service.id,
      providerId: service.providerId,
      title: service.title,
      amount: Number(service.priceFrom),
      notes: orderNotes || undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">加载中...</div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">服务未找到</h2>
          <Link to="/marketplace" className="text-amber-400 hover:text-amber-300 text-sm">
            返回服务市场
          </Link>
        </div>
      </div>
    )
  }

  const tags = service.tags ? JSON.parse(service.tags as string) : []

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Back Button */}
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回服务市场
        </Link>

        {/* Main Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#111] border border-white/5">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-600/10 flex items-center justify-center text-amber-400 flex-shrink-0">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-medium">
                  {service.categoryName}
                </span>
                {service.featured === 1 && (
                  <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-xs font-medium">
                    精选
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{service.title}</h1>
              <p className="text-sm text-neutral-500">{service.summary}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map((tag: string, i: number) => (
              <span key={i} className="px-3 py-1 rounded-lg bg-white/5 text-neutral-400 text-xs">
                {tag}
              </span>
            ))}
          </div>

          {/* Price & Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-[10px] text-neutral-500 mb-1">价格区间</p>
              <p className="text-lg font-bold text-amber-400">
                &yen;{Number(service.priceFrom).toLocaleString()}
                {service.priceTo && ` - ${Number(service.priceTo).toLocaleString()}`}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-[10px] text-neutral-500 mb-1">交付周期</p>
              <p className="text-lg font-bold text-white">{service.deliveryDays}天</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-[10px] text-neutral-500 mb-1">计价方式</p>
              <p className="text-lg font-bold text-white">{service.pricingUnit}制</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <p className="text-[10px] text-neutral-500 mb-1">服务商评分</p>
              <p className="text-lg font-bold text-white flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400" />
                {service.providerRating}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white mb-3">服务详情</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">{service.description}</p>
          </div>

          {/* Expandable Service Details */}
          <div className="mb-8">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <span className="text-sm font-semibold text-white">服务明细与交付物</span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </button>
            {expanded && (
              <div className="mt-3 p-4 rounded-xl bg-white/5 space-y-2">
                {[
                  '需求分析与方案设计',
                  '项目开发与迭代',
                  '测试与质量保证',
                  '部署与上线支持',
                  '售后维护与优化',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-neutral-400">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Provider Info */}
          <div className="p-5 rounded-xl bg-white/5 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                {service.providerName?.charAt(0) || 'P'}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{service.providerName}</p>
                <p className="text-xs text-neutral-500">{service.providerDescription}</p>
              </div>
              {service.providerVerified === 1 && (
                <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                  <Shield className="w-3 h-3" />
                  已认证
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                {service.providerRating} 评分
              </span>
              <span className="flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                {service.providerCompletedOrders} 单已完成
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {service.providerResponseTime} 响应
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleOrder}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-sm hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95"
            >
              立即下单
            </button>
            <button className="px-5 py-3 rounded-xl border border-white/10 text-sm font-medium text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 transition-all flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              咨询
            </button>
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#111] border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-white">确认订单</h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/5 text-neutral-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-xs text-neutral-500 mb-1">服务</p>
                <p className="text-sm font-medium text-white">{service.title}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-xs text-neutral-500 mb-1">金额</p>
                <p className="text-lg font-bold text-amber-400">
                  &yen;{Number(service.priceFrom).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-2">备注（可选）</p>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="补充您的需求说明..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-5 border-t border-white/5 flex gap-3">
              <button
                onClick={() => setShowOrderModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-neutral-300 hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={createOrder.isPending}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-sm hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
              >
                {createOrder.isPending ? '提交中...' : '确认下单'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


