import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  ArrowLeft, Star, Shield, Clock, Check, X,
  Package, Loader2, CreditCard, Truck, MessageCircle,
  AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: '待付款', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <CreditCard className="w-4 h-4" /> },
  paid: { label: '已付款', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: <Check className="w-4 h-4" /> },
  in_progress: { label: '进行中', color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: <Loader2 className="w-4 h-4" /> },
  delivered: { label: '已交付', color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: <Truck className="w-4 h-4" /> },
  completed: { label: '已完成', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <Check className="w-4 h-4" /> },
  cancelled: { label: '已取消', color: 'text-red-400', bg: 'bg-red-500/10', icon: <X className="w-4 h-4" /> },
}

const STATUS_FLOW = ['pending', 'paid', 'in_progress', 'delivered', 'completed']

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showLog, setShowLog] = useState(false)

  const { data: orders } = trpc.order.list.useQuery()
  const order = orders?.find((o) => o.id === Number(id))

  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => {
      // tRPC auto-refetch via query invalidation would be ideal here
    },
  })

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">订单未找到</h2>
          <Link to="/orders" className="text-amber-400 hover:text-amber-300 text-sm">
            返回订单列表
          </Link>
        </div>
      </div>
    )
  }

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const currentStep = STATUS_FLOW.indexOf(order.status)

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: order.id, status: newStatus as any })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回订单列表
        </Link>

        {/* Order Header */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#111] border border-white/5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-neutral-600 font-mono">{order.orderNo}</span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{order.title}</h1>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span>服务商: {order.providerName}</span>
            <span>服务: {order.serviceTitle}</span>
          </div>
        </div>

        {/* Progress Flow */}
        <div className="p-6 rounded-2xl bg-[#111] border border-white/5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">订单进度</h3>
          <div className="flex items-center">
            {STATUS_FLOW.map((step, i) => {
              const isActive = i <= currentStep
              const isCurrent = i === currentStep
              const stepStatus = STATUS_CONFIG[step]
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isActive ? 'bg-amber-500 text-black' : 'bg-white/5 text-neutral-600'
                      } ${isCurrent ? 'ring-2 ring-amber-500/50' : ''}`}
                    >
                      {i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 ${isActive ? 'text-white' : 'text-neutral-600'}`}>
                      {stepStatus?.label}
                    </span>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${i < currentStep ? 'bg-amber-500' : 'bg-white/5'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-5 rounded-2xl bg-[#111] border border-white/5">
            <p className="text-[10px] text-neutral-500 mb-1">订单金额</p>
            <p className="text-2xl font-bold text-amber-400">&yen;{Number(order.amount).toLocaleString()}</p>
          </div>
          <div className="p-5 rounded-2xl bg-[#111] border border-white/5">
            <p className="text-[10px] text-neutral-500 mb-1">创建时间</p>
            <p className="text-sm font-medium text-white">
              {order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN') : '-'}
            </p>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="p-5 rounded-2xl bg-[#111] border border-white/5 mb-6">
            <p className="text-[10px] text-neutral-500 mb-2">备注</p>
            <p className="text-sm text-neutral-400">{order.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="p-5 rounded-2xl bg-[#111] border border-white/5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">操作</h3>
          <div className="flex flex-wrap gap-3">
            {order.status === 'pending' && (
              <button
                onClick={() => handleStatusChange('paid')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-xs hover:from-amber-400 hover:to-amber-500 transition-all"
              >
                确认付款
              </button>
            )}
            {order.status === 'paid' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-xs hover:from-blue-400 hover:to-blue-500 transition-all"
              >
                开始项目
              </button>
            )}
            {order.status === 'in_progress' && (
              <button
                onClick={() => handleStatusChange('delivered')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold text-xs hover:from-cyan-400 hover:to-cyan-500 transition-all"
              >
                确认交付
              </button>
            )}
            {order.status === 'delivered' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-xs hover:from-emerald-400 hover:to-emerald-500 transition-all"
              >
                验收完成
              </button>
            )}
            {(order.status === 'pending' || order.status === 'paid') && (
              <button
                onClick={() => handleStatusChange('cancelled')}
                className="px-4 py-2 rounded-lg border border-red-500/20 text-red-400 text-xs hover:bg-red-500/10 transition-all"
              >
                取消订单
              </button>
            )}
            <button
              onClick={() => navigate(`/smart-match`)}
              className="px-4 py-2 rounded-lg border border-white/10 text-neutral-300 text-xs hover:border-amber-500/50 hover:text-amber-400 transition-all"
            >
              Drew 快照匹配
            </button>
          </div>
        </div>

        {/* Log */}
        <div className="p-5 rounded-2xl bg-[#111] border border-white/5">
          <button
            onClick={() => setShowLog(!showLog)}
            className="flex items-center justify-between w-full"
          >
            <span className="text-sm font-semibold text-white">订单日志</span>
            {showLog ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
          </button>
          {showLog && (
            <div className="mt-4 space-y-2 text-xs text-neutral-500">
              <p>📝 {order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN') : '-'} 订单创建</p>
              <p>📋 状态: {STATUS_CONFIG[order.status]?.label || order.status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
