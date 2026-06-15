import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import {
  User, Mail, Shield, Calendar, Package, FileText, LogOut
} from 'lucide-react'

export default function Profile() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const { data: myRequirements } = trpc.requirement.myList.useQuery(undefined, {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            个人<span className="text-gradient">中心</span>
          </h1>
          <p className="text-neutral-500">管理您的账户信息和需求发布</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="p-6 rounded-2xl bg-[#111] border border-white/5">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </div>
                <h2 className="text-lg font-bold text-white">{user?.name || '用户'}</h2>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400">已认证用户</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <Mail className="w-4 h-4 text-neutral-500" />
                  <div>
                    <p className="text-[10px] text-neutral-500">邮箱</p>
                    <p className="text-xs text-white">{user?.email || '未绑定'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                  <div>
                    <p className="text-[10px] text-neutral-500">注册时间</p>
                    <p className="text-xs text-white">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <User className="w-4 h-4 text-neutral-500" />
                  <div>
                    <p className="text-[10px] text-neutral-500">角色</p>
                    <p className="text-xs text-white">{user?.role === 'admin' ? '管理员' : '普通用户'}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full mt-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          </div>

          {/* Requirements & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/marketplace')}
                className="p-5 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-500/30 transition-all text-left group"
              >
                <Package className="w-6 h-6 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-white">浏览服务</p>
                <p className="text-xs text-neutral-500 mt-1">发现适合您的专业解决方案</p>
              </button>
              <button
                onClick={() => navigate('/publish')}
                className="p-5 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-500/30 transition-all text-left group"
              >
                <FileText className="w-6 h-6 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-white">发布需求</p>
                <p className="text-xs text-neutral-500 mt-1">描述您的项目，等待服务商响应</p>
              </button>
            </div>

            {/* My Requirements */}
            <div className="p-6 rounded-2xl bg-[#111] border border-white/5">
              <h3 className="text-sm font-semibold text-white mb-4">我的需求</h3>
              {myRequirements && myRequirements.length > 0 ? (
                <div className="space-y-3">
                  {myRequirements.map((req) => (
                    <div key={req.id} className="p-4 rounded-xl bg-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">{req.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          req.status === 'open'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : req.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-neutral-500/10 text-neutral-400'
                        }`}>
                          {req.status === 'open' ? '开放中' : req.status === 'in_progress' ? '进行中' : req.status === 'completed' ? '已完成' : '已关闭'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 line-clamp-2 mb-2">{req.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-neutral-600">
                        <span>{req.categoryName}</span>
                        {req.budgetFrom && (
                          <span>预算 &yen;{Number(req.budgetFrom).toLocaleString()}{req.budgetTo && ` - ${Number(req.budgetTo).toLocaleString()}`}</span>
                        )}
                        <span>{req.createdAt ? new Date(req.createdAt).toLocaleDateString('zh-CN') : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">暂无发布的需求</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


