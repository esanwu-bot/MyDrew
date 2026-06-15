import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  ArrowLeft, Star, Shield, Clock, Check, ArrowRight,
  AlertCircle, MessageCircle, ShoppingCart
} from 'lucide-react'

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: caseData, isLoading } = trpc.case.byId.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  )

  const { data: relatedServices } = trpc.service.list.useQuery(
    { search: caseData?.category },
    { enabled: !!caseData }
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">加载中...</div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">案例未找到</h2>
          <Link to="/" className="text-amber-400 hover:text-amber-300 text-sm">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const tags = caseData.tags ? JSON.parse(caseData.tags as string) : []
  const results = caseData.results ? JSON.parse(caseData.results as string) : []
  const credentials = caseData.credentials ? JSON.parse(caseData.credentials as string) : []

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        {/* Header */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#111] border border-white/5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-medium">
              {caseData.category}
            </span>
            <span className="text-xs text-neutral-500">{caseData.duration}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{caseData.title}</h1>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[8px] font-bold">
                {caseData.providerName?.charAt(0) || 'P'}
              </div>
              <span>{caseData.providerName}</span>
            </div>
            {caseData.budget && <span>预算 {caseData.budget}</span>}
            {caseData.clientName && <span>客户 {caseData.clientName}</span>}
          </div>
        </div>

        {/* Challenge & Solution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-5 rounded-2xl bg-[#111] border border-white/5">
            <h3 className="text-sm font-semibold text-white mb-3">项目挑战</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">{caseData.challenge}</p>
          </div>
          <div className="p-5 rounded-2xl bg-[#111] border border-white/5">
            <h3 className="text-sm font-semibold text-white mb-3">解决方案</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">{caseData.solution}</p>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#111] border border-white/5 mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">项目成果</h3>
            <div className="space-y-2">
              {results.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-neutral-400">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credentials */}
        {credentials.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#111] border border-white/5 mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">交付凭证</h3>
            <div className="flex flex-wrap gap-2">
              {credentials.map((c: string, i: number) => (
                <span key={i} className="px-3 py-1 rounded-lg bg-white/5 text-neutral-400 text-xs">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {tags.map((tag: string, i: number) => (
              <span key={i} className="px-3 py-1 rounded-lg bg-white/5 text-neutral-400 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Related Services */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">相关服务</h3>
          {relatedServices && relatedServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedServices.slice(0, 3).map((svc) => (
                <Link
                  key={svc.id}
                  to={`/service/${svc.slug}`}
                  className="p-5 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-500/30 transition-all"
                >
                  <h4 className="font-medium text-white text-sm mb-1">{svc.title}</h4>
                  <p className="text-xs text-neutral-500 line-clamp-2 mb-2">{svc.summary}</p>
                  <span className="text-sm font-semibold text-amber-400">&yen;{Number(svc.priceFrom).toLocaleString()}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">暂无相关服务</p>
          )}
        </div>

        {/* CTA */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-red-600/5 to-transparent border border-amber-500/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-white mb-1">有类似需求？</h3>
              <p className="text-xs text-neutral-400">Drew 可以帮您匹配最适合的服务商</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/smart-match?req=${encodeURIComponent(caseData.category + ' ' + caseData.title)}`)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-xs hover:from-amber-400 hover:to-amber-500 transition-all"
              >
                Drew 智能匹配
              </button>
              <Link
                to="/publish"
                className="px-5 py-2.5 rounded-xl border border-white/10 text-xs text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 transition-all"
              >
                发布需求
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
