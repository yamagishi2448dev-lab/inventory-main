'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/lib/contexts/SidebarContext'
import { Home, Package, Truck, FolderTree, Building2, MapPin, Ruler, Layers } from 'lucide-react'

// v2.1 メニュー項目（アイコン付き）
const menuItems = [
  { name: 'ダッシュボード', href: '/dashboard', icon: Home },
  { name: '商品', href: '/products', icon: Package },
  { name: '委託品', href: '/consignments', icon: Truck },  // v2.1追加
  { name: '品目', href: '/categories', icon: FolderTree },
  { name: 'メーカー', href: '/manufacturers', icon: Building2 },
  { name: '場所', href: '/locations', icon: MapPin },
  { name: '単位', href: '/units', icon: Ruler },
  { name: '素材項目', href: '/material-types', icon: Layers },  // v2.1追加
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, setOpen, isMobile, toggle } = useSidebar()

  return (
    <>
      {/* モバイルオーバーレイ背景 */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* サイドバー本体 */}
      <div
        className={`
          ${isMobile ? 'fixed left-0 top-0 z-50 h-screen' : 'sticky top-0 h-screen'}
          ${isOpen ? 'w-48' : 'w-16'}
          ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
          bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col overflow-y-auto
          transition-all duration-300 ease-in-out
        `}
      >
        {/* ロゴセクション */}
        <button
          type="button"
          className="p-4 text-left focus:outline-none"
          onClick={toggle}
          aria-label="サイドバーを開閉"
        >
          {isOpen ? (
            <>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Inventory
              </h1>
              <p className="text-xs text-gray-400">在庫管理システム v2.0</p>
            </>
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center shadow-lg">
              <Package className="w-5 h-5" />
            </div>
          )}
        </button>

        {/* ナビゲーション */}
        <nav className="flex-1 px-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                title={!isOpen ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="ml-3">{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
