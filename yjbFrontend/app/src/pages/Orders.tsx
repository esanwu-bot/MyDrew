import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import {
  Package, CheckCircle, Truck, CreditCard, XCircle,
  ArrowRight, Loader2
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: '待付款', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <CreditCard className="w-4 h-4" /> },
  paid: { label: '已付款', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: <CheckCircle className="w-4 h-4" /> },
  in_progress: { label: '进行中', color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: <Loader2 className="w-4 h-4" /> },
  delivered: { label: '已交付', color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: <Truck className="w-4 h-4" /> },
  completed: { label: '已完成', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: '已取消', color: 'text-red-400', bg: 'bg-red-500/10', icon: <XCircle className="w-4 h-4" /> },
}

export default function Orders() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { data: orders, isLoading } = trpc.order.list.useQuery(undefined, {
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [authLoading, isAuthenticated, navigate])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            我的<span className="text-gradient">订单</span>
          </h1>
          <p className="text-neutral-500">管理您的服务订单和交易记录</p>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#111] border border-white/5 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-1/4 mb-3" />
                <div className="h-3 bg-white/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
              return (
                <div
                  key={order.id}
                  className="p-5 sm:p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-neutral-600 font-mono">{order.orderNo}</span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">{order.title}</h3>
                      <p className="text-xs text-neutral-500">
                        服务商: {order.providerName} &middot; {order.serviceTitle}
                      </p>
                      {order.notes && (
                        <p className="text-xs text-neutral-600 mt-1">{order.notes}</p>
                      )}
                    </div>

                    {/* Price & Actions */}
                    <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                      <p className="text-lg font-bold text-amber-400">
                        &yen;{Number(order.amount).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-neutral-600">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('zh-CN') : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">暂无订单</h3>
            <p className="text-sm text-neutral-500 mb-6">您还没有下单任何服务</p>
            <button
              onClick={() => navigate('/marketplace')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-sm hover:from-amber-400 hover:to-amber-500 transition-all inline-flex items-center gap-2"
            >
              去服务市场
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
