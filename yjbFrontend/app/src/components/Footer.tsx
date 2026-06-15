import { Link } from 'react-router'
import { Briefcase, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gradient">云匠邦</span>
            </Link>
            <p className="text-sm text-neutral-500 leading-relaxed">
              一站式企业数字化服务外包与灵活用工平台，连接顶尖数字工匠。
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">平台服务</h4>
            <ul className="space-y-2.5">
              <li><Link to="/marketplace" className="text-sm text-neutral-500 hover:text-amber-400 transition-colors">服务市场</Link></li>
              <li><Link to="/publish" className="text-sm text-neutral-500 hover:text-amber-400 transition-colors">发布需求</Link></li>
              <li><span className="text-sm text-neutral-500 hover:text-amber-400 transition-colors cursor-pointer">服务商入驻</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">关于我们</h4>
            <ul className="space-y-2.5">
              <li><span className="text-sm text-neutral-500 hover:text-amber-400 transition-colors cursor-pointer">平台介绍</span></li>
              <li><span className="text-sm text-neutral-500 hover:text-amber-400 transition-colors cursor-pointer">使用指南</span></li>
              <li><span className="text-sm text-neutral-500 hover:text-amber-400 transition-colors cursor-pointer">隐私政策</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">联系方式</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-sm text-neutral-500">
                <Mail className="w-4 h-4" />
                contact@yunjiang.com
              </li>
              <li className="flex items-center gap-3 mt-4">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400 hover:text-amber-400 hover:bg-white/10 transition-all cursor-pointer">
                  <Github className="w-4 h-4" />
                </span>
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400 hover:text-amber-400 hover:bg-white/10 transition-all cursor-pointer">
                  <Twitter className="w-4 h-4" />
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-600">
            &copy; 2026 云匠邦. All rights reserved.
          </p>
          <p className="text-xs text-neutral-600">
            致力于为您提供专业的数字化服务
          </p>
        </div>
      </div>
    </footer>
  )
}
