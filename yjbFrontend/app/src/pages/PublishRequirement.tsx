import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import {
  Send, AlertCircle, CheckCircle,
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

export default function PublishRequirement() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { data: categories } = trpc.category.list.useQuery()

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [budgetFrom, setBudgetFrom] = useState('')
  const [budgetTo, setBudgetTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const createRequirement = trpc.requirement.create.useMutation({
    onSuccess: () => {
      setSubmitted(true)
      setTitle('')
      setCategoryId('')
      setDescription('')
      setBudgetFrom('')
      setBudgetTo('')
      setDeadline('')
      setContactPhone('')
    },
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [authLoading, isAuthenticated, navigate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !categoryId || !description.trim()) return

    createRequirement.mutate({
      title: title.trim(),
      categoryId: Number(categoryId),
      description: description.trim(),
      budgetFrom: budgetFrom ? Number(budgetFrom) : undefined,
      budgetTo: budgetTo ? Number(budgetTo) : undefined,
      deadline: deadline || undefined,
      contactPhone: contactPhone || undefined,
    })
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">加载中...</div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
        <div className="max-w-lg mx-auto px-4 sm:px-6 text-center pt-20">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">需求发布成功！</h2>
          <p className="text-sm text-neutral-500 mb-8">
            您的需求已提交，认证服务商将在 2 小时内与您联系。您可以在个人中心查看需求状态。
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-3 rounded-xl border border-white/10 text-sm font-medium text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 transition-all"
            >
              继续发布
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-sm hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              查看我的需求
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            发布<span className="text-gradient">需求</span>
          </h1>
          <p className="text-neutral-500">描述您的项目需求，让专业服务商主动找上门</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              需求标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：需要开发一个电商小程序"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              服务分类 <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                    categoryId === cat.id
                      ? 'bg-amber-500 text-black border-amber-500'
                      : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {CATEGORY_ICONS[cat.icon || '']}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              需求描述 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="详细描述您的项目需求，包括功能要求、技术栈偏好、交付时间等..."
              required
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all resize-none"
            />
          </div>

          {/* Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">预算下限</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">&yen;</span>
                <input
                  type="number"
                  value={budgetFrom}
                  onChange={(e) => setBudgetFrom(e.target.value)}
                  placeholder="例如：50000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-5 py-3.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">预算上限</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">&yen;</span>
                <input
                  type="number"
                  value={budgetTo}
                  onChange={(e) => setBudgetTo(e.target.value)}
                  placeholder="例如：100000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-5 py-3.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Deadline & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">期望交付时间</label>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="例如：1个月"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">联系电话</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="方便服务商联系您"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50 transition-all"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={createRequirement.isPending || !title.trim() || !categoryId || !description.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-sm hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {createRequirement.isPending ? '发布中...' : '发布需求'}
            </button>
            <p className="text-xs text-neutral-600 text-center mt-3 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              发布即表示您同意平台的服务条款
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
