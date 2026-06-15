import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Search, ArrowRight, Star, Shield, Clock, Users,
  Code2, Palette, TrendingUp, Lightbulb, Brain, Clapperboard,
  ChevronRight, CheckCircle
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const GRID_IMAGES = Array.from({ length: 8 }, (_, i) => `/images/grid-${i + 1}.jpg`)

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Code2: <Code2 className="w-5 h-5" />,
  Palette: <Palette className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  Lightbulb: <Lightbulb className="w-5 h-5" />,
  Brain: <Brain className="w-5 h-5" />,
  Clapperboard: <Clapperboard className="w-5 h-5" />,
}

const SERVICE_COLORS = [
  'from-blue-500/20 to-blue-600/10',
  'from-purple-500/20 to-purple-600/10',
  'from-amber-500/20 to-amber-600/10',
  'from-emerald-500/20 to-emerald-600/10',
  'from-indigo-500/20 to-indigo-600/10',
]

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)
  const servicesRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  const { data: stats } = trpc.dashboard.stats.useQuery()
  const { data: categories } = trpc.category.list.useQuery()
  const { data: services } = trpc.service.list.useQuery({ featured: true })
  const { data: cases } = trpc.case.list.useQuery()

  // Hero 3D Grid Animation
  useEffect(() => {
    if (!gridRef.current) return

    const items = gridRef.current.querySelectorAll('.grid-item')
    const numCols = 4
    const numRows = Math.ceil(items.length / numCols)

    gsap.fromTo(
      items,
      {
        z: () => gsap.utils.random(200, 800),
        scale: 0.6,
        opacity: 0,
        filter: 'brightness(15%)',
      },
      {
        z: 0,
        scale: 1,
        opacity: 1,
        filter: 'brightness(60%)',
        ease: 'none',
        scrollTrigger: {
          trigger: gridRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
        stagger: {
          amount: 0.4,
          from: 'center',
          grid: [numRows, numCols],
        },
      }
    )

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [])

  // Marquee scroll velocity effect
  useEffect(() => {
    if (!marqueeRef.current) return

    const content = marqueeRef.current.querySelector('.marquee-content')
    if (!content) return

    const baseTween = gsap.to(content, {
      xPercent: -50,
      repeat: -1,
      duration: 20,
      ease: 'linear',
    })

    ScrollTrigger.create({
      trigger: marqueeRef.current,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const velocity = self.getVelocity()
        const skewAmount = Math.min(Math.max(velocity / -500, -10), 10)
        const timeScale = 1 + Math.abs(velocity / 8000)

        gsap.to(content, {
          skewX: skewAmount,
          duration: 0.5,
          ease: 'power2.out',
          overwrite: true,
        })

        baseTween.timeScale(Math.min(timeScale, 3))
      },
    })

    return () => {
      baseTween.kill()
    }
  }, [])

  // Services cards animation
  useEffect(() => {
    if (!servicesRef.current) return

    const cards = servicesRef.current.querySelectorAll('.service-card')
    cards.forEach((card) => {
      gsap.from(card, {
        y: 80,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: card,
          start: 'top bottom-=10%',
          end: 'top center',
          scrub: true,
        },
      })
    })

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [services])

  // Stats counter animation
  useEffect(() => {
    if (!statsRef.current || !stats) return

    const counters = statsRef.current.querySelectorAll('.stat-number')
    counters.forEach((counter) => {
      gsap.from(counter, {
        textContent: 0,
        duration: 2,
        ease: 'power2.out',
        snap: { textContent: 1 },
        scrollTrigger: {
          trigger: counter,
          start: 'top bottom-=10%',
        },
      })
    })
  }, [stats])

  const marqueeText = '极速交付 \u00B7 品质保障 \u00B7 灵活用工 \u00B7 技术攻坚 \u00B7 品牌设计 \u00B7 成本优化 \u00B7 7x24响应 \u00B7 可信验证 \u00B7 '

  return (
    <div className="bg-[#0a0a0a]">
      {/* ====== HERO SECTION ====== */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
        {/* 3D Perspective Grid Background */}
        <div className="absolute inset-0 perspective-grid pointer-events-none">
          <div
            ref={gridRef}
            className="absolute inset-0 preserve-3d grid grid-cols-4 gap-2 p-4 opacity-40"
            style={{ transform: 'rotateX(5deg) rotateY(-5deg)' }}
          >
            {GRID_IMAGES.map((src, i) => (
              <div
                key={i}
                className="grid-item rounded-xl overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dark overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50 z-10" />

        {/* Hero Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="max-w-2xl">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
              <span className="text-gradient">连接顶尖</span>
              <br />
              <span className="text-white">数字工匠</span>
            </h1>
            <p className="text-lg sm:text-xl text-neutral-400 leading-relaxed mb-8 max-w-lg">
              一站式企业数字化服务外包与灵活用工平台。从软件开发到品牌设计，从数字营销到AI智能，找到最适合您的专业服务商。
            </p>

            {/* Search Bar */}
            <div className="flex items-center gap-3 max-w-xl mb-6">
              <div className="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all">
                <Search className="w-5 h-5 text-neutral-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="搜索服务，例如：微服务架构..."
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-neutral-600"
                />
              </div>
              <Link
                to="/marketplace"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-sm hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95 flex items-center gap-2 flex-shrink-0"
              >
                搜索
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                to="/publish"
                className="px-6 py-3 rounded-xl border border-white/10 text-sm font-medium text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 transition-all"
              >
                发布需求
              </Link>
              <Link
                to="/marketplace"
                className="px-6 py-3 rounded-xl text-sm font-medium text-neutral-400 hover:text-white transition-all flex items-center gap-1.5"
              >
                浏览服务
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/smart-match"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
              >
                ⚡ Drew 智能匹配
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====== MARQUEE SECTION ====== */}
      <section ref={marqueeRef} className="py-16 overflow-hidden border-y border-white/5">
        <div className="marquee-content flex whitespace-nowrap" style={{ width: 'max-content' }}>
          <span className="text-[6vw] md:text-[5vw] font-black text-neutral-800 tracking-tight px-4 select-none">
            {marqueeText}{marqueeText}
          </span>
          <span className="text-[6vw] md:text-[5vw] font-black text-neutral-800 tracking-tight px-4 select-none">
            {marqueeText}{marqueeText}
          </span>
        </div>
      </section>

      {/* ====== SERVICE CATEGORIES ====== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              核心<span className="text-gradient">服务领域</span>
            </h2>
            <p className="text-neutral-500 max-w-lg mx-auto">
              覆盖企业数字化转型的全链路需求，每个领域都有认证专家为您服务
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories?.map((cat, i) => (
              <Link
                key={cat.id}
                to={`/marketplace`}
                className={`group relative p-6 rounded-2xl bg-gradient-to-br ${SERVICE_COLORS[i % SERVICE_COLORS.length]} border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 card-glow`}
              >
                <div className="text-amber-400 mb-3">
                  {CATEGORY_ICONS[cat.icon || ''] || <Code2 className="w-5 h-5" />}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{cat.name}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{cat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FEATURED SERVICES ====== */}
      <section ref={servicesRef} className="py-20 sm:py-28 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-14">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                精选<span className="text-gradient">服务</span>
              </h2>
              <p className="text-neutral-500">平台认证服务商的优质解决方案</p>
            </div>
            <Link
              to="/marketplace"
              className="hidden sm:flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services?.slice(0, 6).map((svc) => (
              <Link
                key={svc.id}
                to={`/service/${svc.slug}`}
                className="service-card group relative p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 card-glow"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-600/10 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-medium">
                        {svc.categoryName}
                      </span>
                      {svc.featured === 1 && (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-medium">
                          精选
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-amber-400 transition-colors">
                      {svc.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 leading-relaxed mb-4 line-clamp-2">
                  {svc.summary}
                </p>

                <div className="flex items-center gap-3 text-xs text-neutral-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" />
                    {svc.providerRating}
                  </span>
                  <span>{svc.deliveryDays}天交付</span>
                  <span>{svc.pricingUnit}制</span>
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
                    {svc.priceTo && ` - ${Number(svc.priceTo).toLocaleString()}`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ====== STATS SECTION ====== */}
      <section ref={statsRef} className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              平台<span className="text-gradient">实力</span>
            </h2>
            <p className="text-neutral-500 max-w-lg mx-auto">
              数据见证成长，口碑铸就品牌
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Code2 className="w-6 h-6" />, value: stats?.serviceCount || 8, label: '活跃服务', suffix: '+' },
              { icon: <Users className="w-6 h-6" />, value: stats?.providerCount || 5, label: '认证服务商', suffix: '+' },
              { icon: <CheckCircle className="w-6 h-6" />, value: stats?.caseCount || 4, label: '成功案例', suffix: '+' },
              { icon: <Clock className="w-6 h-6" />, value: 2, label: '平均响应', suffix: 'h' },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#111] border border-white/5 text-center hover:border-amber-500/20 transition-all card-glow"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
                  {stat.icon}
                </div>
                <p className="stat-number text-3xl font-bold text-white mb-1">
                  {stat.value}{stat.suffix}
                </p>
                <p className="text-xs text-neutral-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== HOT CASES ====== */}
      <section className="py-20 sm:py-28 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-14">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                热门<span className="text-gradient">案例</span>
              </h2>
              <p className="text-neutral-500">真实项目交付，成果有据可查</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {cases?.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="group p-6 rounded-2xl bg-[#111] border border-white/5 hover:border-amber-500/20 transition-all duration-300 hover:-translate-y-1 card-glow cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium">
                    {c.category}
                  </span>
                  <span className="text-[10px] text-neutral-600">{c.duration}</span>
                </div>
                <h3 className="font-semibold text-white text-sm mb-2 group-hover:text-amber-400 transition-colors">
                  {c.title}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed mb-4 line-clamp-2">
                  {c.challenge}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                      {c.providerName?.charAt(0) || 'P'}
                    </div>
                    <span className="text-xs text-neutral-400">{c.providerName}</span>
                  </div>
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    交付凭证已上链
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA SECTION ====== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-amber-500/10 via-red-600/5 to-transparent border border-amber-500/10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              准备好开始您的项目了吗？
            </h2>
            <p className="text-neutral-400 mb-8 max-w-md mx-auto">
              无论是技术攻坚还是品牌升级，云匠邦都能为您匹配最合适的专业团队
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                to="/publish"
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-sm hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95"
              >
                发布需求
              </Link>
              <Link
                to="/marketplace"
                className="px-8 py-3.5 rounded-xl border border-white/10 text-sm font-medium text-neutral-300 hover:border-amber-500/50 hover:text-amber-400 transition-all"
              >
                浏览服务
              </Link>
              <Link
                to="/smart-match"
                className="px-8 py-3.5 rounded-xl border border-amber-500/30 text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-all"
              >
                ⚡ Drew 智能匹配
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
