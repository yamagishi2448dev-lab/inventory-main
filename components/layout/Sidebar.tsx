'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/lib/contexts/SidebarContext'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Home, Package, Truck, FolderTree, Building2, MapPin, Ruler, Layers, Tag, ChevronDown, Database, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

// メイン項目
const mainMenuItems = [
  { name: 'ダッシュボード', href: '/dashboard', icon: Home },
  { name: '商品', href: '/products', icon: Package },
  { name: '委託品', href: '/consignments', icon: Truck },
]

// マスタデータ項目（折りたたみ）
const masterDataItems = [
  { name: '品目', href: '/categories', icon: FolderTree },
  { name: 'メーカー', href: '/manufacturers', icon: Building2 },
  { name: '場所', href: '/locations', icon: MapPin },
  { name: '単位', href: '/units', icon: Ruler },
  { name: '素材項目', href: '/material-types', icon: Layers },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, setOpen, isMobile, toggle } = useSidebar()
  const [isMasterOpen, setIsMasterOpen] = useState(() => {
    return masterDataItems.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    )
  })

  const isMasterActive = masterDataItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  const renderMenuItem = (item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
    const Icon = item.icon
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

    return (
      <Link
        key={item.href}
        href={item.href}
        title={!isOpen ? item.name : undefined}
        className={cn(
          "flex items-center px-3 py-2 rounded-md transition-all duration-200 group relative",
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        )}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
        {isOpen && <span className="ml-3 text-sm">{item.name}</span>}

        {/* Active Indicator Strip (Optional, removed for cleaner look, relying on bg-blue-50) */}
      </Link>
    )
  }

  return (
    <>
      {/* モバイルオーバーレイ背景 */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* サイドバー本体 */}
      <aside
        className={cn(
          "bg-white border-r border-border flex flex-col overflow-y-auto transition-all duration-300 ease-in-out z-50",
          isMobile ? 'fixed left-0 top-0 h-screen shadow-xl' : 'sticky top-0 h-screen',
          isOpen ? 'w-64' : 'w-16 ml-0',
          isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'
        )}
      >
        {/* ロゴセクション */}
        <div className="h-16 flex items-center px-4 border-b border-border/50 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <button
            type="button"
            className="flex items-center gap-3 focus:outline-none w-full group"
            onClick={toggle}
            aria-label="サイドバーを開閉"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-blue-200 shadow-md transition-transform group-hover:scale-105">
              <Package className="h-5 w-5" />
            </div>
            {isOpen && (
              <div className="flex flex-col items-start overflow-hidden">
                <span className="font-bold text-slate-900 truncate">Inventory</span>
                <span className="text-[10px] text-slate-500 font-medium">在庫管理システム</span>
              </div>
            )}
          </button>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {/* メイン項目 */}
          <div className="space-y-1">
            {mainMenuItems.map(renderMenuItem)}
          </div>

          <div className="my-4 border-t border-border/50 mx-2" />

          {/* マスタデータ（折りたたみ） */}
          <Collapsible
            open={isOpen && isMasterOpen}
            onOpenChange={(open) => {
              if (!isOpen && open) {
                // サイドバーが閉じている時に開こうとしたら、サイドバーも開く
                setOpen(true)
                setIsMasterOpen(true)
              } else {
                setIsMasterOpen(open)
              }
            }}
          >
            <CollapsibleTrigger
              className={cn(
                "flex items-center w-full px-3 py-2 rounded-md transition-all duration-200 group text-slate-600 hover:bg-slate-100",
                isMasterActive && !isMasterOpen && "bg-blue-50 text-blue-700"
              )}
              title={!isOpen ? 'マスタデータ' : undefined}
            >
              <Database className={cn("w-5 h-5 flex-shrink-0 transition-colors", isMasterActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
              {isOpen && (
                <>
                  <span className="ml-3 flex-1 text-left text-sm font-medium">マスタデータ</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-400 transition-transform duration-200",
                      isMasterOpen ? 'rotate-180' : ''
                    )}
                  />
                </>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {/* Indent lines for hierarchy */}
              <div className="border-l border-slate-200 ml-5 pl-2 space-y-1">
                {masterDataItems.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={!isOpen ? item.name : undefined}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-md transition-all duration-200 text-sm",
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      )}
                    >
                      <Icon className={cn("w-4 h-4 mr-2", isActive ? "text-blue-600" : "text-slate-400")} />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="my-4 border-t border-border/50 mx-2" />

          {/* タグ設定（独立項目） */}
          {renderMenuItem({ name: 'タグ設定', href: '/tags', icon: Tag })}
        </nav>
      </aside>
    </>
  )
}
